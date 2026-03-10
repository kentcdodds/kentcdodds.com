import { timingSafeEqual } from 'node:crypto'
import { getSandbox } from '@cloudflare/sandbox'

export { Sandbox as CallKentAudioContainer } from '@cloudflare/sandbox'

const containerServiceCommand = 'node src/index.ts'
const containerServicePort = 8788

type Env = {
	AUDIO_CONTAINER: any
	R2_ENDPOINT: string
	R2_ACCESS_KEY_ID: string
	R2_SECRET_ACCESS_KEY: string
	CALL_KENT_R2_BUCKET: string
	CALL_KENT_AUDIO_CONTAINER_TOKEN: string
}

function getBearerToken(authorizationHeader: string | null) {
	return authorizationHeader?.slice('Bearer '.length) ?? ''
}

function timingSafeEqualString(left: string, right: string) {
	const leftBuffer = Buffer.from(left)
	const rightBuffer = Buffer.from(right)
	if (leftBuffer.length !== rightBuffer.length) {
		return false
	}
	return timingSafeEqual(leftBuffer, rightBuffer)
}

function isAuthorized(request: Request, env: Env) {
	return timingSafeEqualString(
		getBearerToken(request.headers.get('authorization')),
		env.CALL_KENT_AUDIO_CONTAINER_TOKEN,
	)
}

function getAudioSandbox(env: Env) {
	return getSandbox(env.AUDIO_CONTAINER, 'call-kent-audio')
}

function getAudioContainerEnvVars({
	env,
	origin,
}: {
	env: Env
	origin: string
}) {
	return {
		PORT: String(containerServicePort),
		R2_ENDPOINT: env.R2_ENDPOINT,
		R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
		R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
		CALL_KENT_R2_BUCKET: env.CALL_KENT_R2_BUCKET,
		CALL_KENT_AUDIO_CONTAINER_TOKEN: env.CALL_KENT_AUDIO_CONTAINER_TOKEN,
		CALL_KENT_AUDIO_CONTAINER_HEARTBEAT_URL: `${origin}/internal/heartbeat`,
		CALL_KENT_AUDIO_CONTAINER_SHUTDOWN_URL: `${origin}/internal/shutdown-if-idle`,
	}
}

async function ensureAudioContainerServiceRunning({
	env,
	origin,
}: {
	env: Env
	origin: string
}) {
	const sandbox = getAudioSandbox(env)
	await sandbox.setKeepAlive(true)
	const runningProcesses = await sandbox.listProcesses()
	const existingService = runningProcesses.find(
		(process) => process.command === containerServiceCommand,
	)
	if (existingService) return sandbox

	const service = await sandbox.startProcess(containerServiceCommand, {
		cwd: '/app',
		env: getAudioContainerEnvVars({ env, origin }),
	})

	try {
		await service.waitForPort(containerServicePort, {
			mode: 'tcp',
			timeout: 60_000,
		})
	} catch (error) {
		const existingAfterFailure = await sandbox
			.listProcesses()
			.then((processes) =>
				processes.some((process) => process.command === containerServiceCommand),
			)
			.catch(() => false)
		if (existingAfterFailure) {
			return sandbox
		}
		const logs = await sandbox.getProcessLogs(service.id).catch(() => null)
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(
			`Failed to start audio container service: ${message}${logs ? `\n${logs}` : ''}`,
		)
	}

	return sandbox
}

const proxyJobCommand = String.raw`node -e "const body=process.env.CALL_KENT_AUDIO_JOB_REQUEST_BODY||''; fetch('http://127.0.0.1:8788/jobs/episode-audio',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+process.env.CALL_KENT_AUDIO_CONTAINER_TOKEN},body}).then(async (response)=>{const text=await response.text(); process.stdout.write(JSON.stringify({ok:response.ok,status:response.status,statusText:response.statusText,body:text})); if(!response.ok) process.exit(2);}).catch((error)=>{process.stderr.write(error instanceof Error ? error.message : String(error)); process.exit(1);});"`

async function proxyJobToAudioContainer({
	env,
	origin,
	jobRequestBody,
}: {
	env: Env
	origin: string
	jobRequestBody: string
}) {
	const sandbox = await ensureAudioContainerServiceRunning({ env, origin })
	const result = await sandbox.exec(proxyJobCommand, {
		env: {
			CALL_KENT_AUDIO_CONTAINER_TOKEN: env.CALL_KENT_AUDIO_CONTAINER_TOKEN,
			CALL_KENT_AUDIO_JOB_REQUEST_BODY: jobRequestBody,
		},
		timeout: 60_000,
	})
	if (!result.success) {
		throw new Error(
			`Container request command failed: ${result.stderr || result.stdout || 'unknown error'}`,
		)
	}
	const parsed = JSON.parse(result.stdout) as {
		ok: boolean
		status: number
		statusText: string
		body: string
	}
	return parsed
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url)

		if (url.pathname === '/internal/heartbeat') {
			if (!isAuthorized(request, env)) {
				return new Response('Unauthorized', { status: 401 })
			}
			await getAudioSandbox(env).setKeepAlive(true)
			return Response.json({ ok: true, status: 'renewed' })
		}

		if (url.pathname === '/internal/shutdown-if-idle') {
			if (!isAuthorized(request, env)) {
				return new Response('Unauthorized', { status: 401 })
			}
			const sandbox = getAudioSandbox(env)
			await sandbox.setKeepAlive(false)
			await sandbox.destroy()
			return Response.json({ ok: true, status: 'stopped' })
		}

		if (url.pathname !== '/jobs/episode-audio') {
			return new Response('Not found', { status: 404 })
		}

		if (!isAuthorized(request, env)) {
			return new Response('Unauthorized', { status: 401 })
		}

		try {
			const body = await request.text()
			const proxied = await proxyJobToAudioContainer({
				env,
				origin: url.origin,
				jobRequestBody: body,
			})
			return new Response(proxied.body, {
				status: proxied.status,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			return new Response(`Container proxy failed: ${message}`, { status: 502 })
		}
	},
}
