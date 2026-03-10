import { timingSafeEqual } from 'node:crypto'
import { getSandbox } from '@cloudflare/sandbox'

export { Sandbox as CallKentAudioSandbox } from '@cloudflare/sandbox'

const sandboxServiceCommand = 'node src/index.ts'
const sandboxServicePort = 8788

type Env = {
	AUDIO_SANDBOX: any
	R2_ENDPOINT: string
	R2_ACCESS_KEY_ID: string
	R2_SECRET_ACCESS_KEY: string
	CALL_KENT_R2_BUCKET: string
	CALL_KENT_AUDIO_SANDBOX_TOKEN: string
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
		env.CALL_KENT_AUDIO_SANDBOX_TOKEN,
	)
}

function getAudioSandbox(env: Env) {
	return getSandbox(env.AUDIO_SANDBOX, 'call-kent-audio')
}

function getAudioSandboxEnvVars({
	env,
	origin,
}: {
	env: Env
	origin: string
}) {
	return {
		PORT: String(sandboxServicePort),
		R2_ENDPOINT: env.R2_ENDPOINT,
		R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
		R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
		CALL_KENT_R2_BUCKET: env.CALL_KENT_R2_BUCKET,
		CALL_KENT_AUDIO_SANDBOX_TOKEN: env.CALL_KENT_AUDIO_SANDBOX_TOKEN,
		CALL_KENT_AUDIO_SANDBOX_HEARTBEAT_URL: `${origin}/internal/heartbeat`,
		CALL_KENT_AUDIO_SANDBOX_SHUTDOWN_URL: `${origin}/internal/shutdown-if-idle`,
	}
}

async function ensureAudioSandboxServiceRunning({
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
		(process) => process.command === sandboxServiceCommand,
	)
	if (existingService) return sandbox

	const service = await sandbox.startProcess(sandboxServiceCommand, {
		cwd: '/app',
		env: getAudioSandboxEnvVars({ env, origin }),
	})

	try {
		await service.waitForPort(sandboxServicePort, {
			mode: 'tcp',
			timeout: 60_000,
		})
	} catch (error) {
		const existingAfterFailure = await sandbox
			.listProcesses()
			.then((processes) =>
				processes.some((process) => process.command === sandboxServiceCommand),
			)
			.catch(() => false)
		if (existingAfterFailure) {
			return sandbox
		}
		const logs = await sandbox.getProcessLogs(service.id).catch(() => null)
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(
			`Failed to start audio sandbox service: ${message}${logs ? `\n${logs}` : ''}`,
		)
	}

	return sandbox
}

const proxyJobCommand = String.raw`node -e "const body=process.env.CALL_KENT_AUDIO_JOB_REQUEST_BODY||''; fetch('http://127.0.0.1:8788/jobs/episode-audio',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+process.env.CALL_KENT_AUDIO_SANDBOX_TOKEN},body}).then(async (response)=>{const text=await response.text(); process.stdout.write(JSON.stringify({ok:response.ok,status:response.status,statusText:response.statusText,body:text})); if(!response.ok) process.exit(2);}).catch((error)=>{process.stderr.write(error instanceof Error ? error.message : String(error)); process.exit(1);});"`
const statusCheckCommand = String.raw`node -e "fetch('http://127.0.0.1:8788/internal/status',{headers:{authorization:'Bearer '+process.env.CALL_KENT_AUDIO_SANDBOX_TOKEN}}).then(async (response)=>{const text=await response.text(); process.stdout.write(JSON.stringify({ok:response.ok,status:response.status,statusText:response.statusText,body:text})); if(!response.ok) process.exit(2);}).catch((error)=>{process.stderr.write(error instanceof Error ? error.message : String(error)); process.exit(1);});"`

async function proxyJobToAudioSandbox({
	env,
	origin,
	jobRequestBody,
}: {
	env: Env
	origin: string
	jobRequestBody: string
}) {
	const sandbox = await ensureAudioSandboxServiceRunning({ env, origin })
	const result = await sandbox.exec(proxyJobCommand, {
		env: {
			CALL_KENT_AUDIO_SANDBOX_TOKEN: env.CALL_KENT_AUDIO_SANDBOX_TOKEN,
			CALL_KENT_AUDIO_JOB_REQUEST_BODY: jobRequestBody,
		},
		timeout: 60_000,
	})
	if (!result.success) {
		throw new Error(
			`Sandbox request command failed: ${result.stderr || result.stdout || 'unknown error'}`,
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

async function fetchAudioSandboxStatus({
	env,
	sandbox,
}: {
	env: Env
	sandbox: ReturnType<typeof getAudioSandbox>
}) {
	const result = await sandbox.exec(statusCheckCommand, {
		env: {
			CALL_KENT_AUDIO_SANDBOX_TOKEN: env.CALL_KENT_AUDIO_SANDBOX_TOKEN,
		},
		timeout: 10_000,
	})
	if (!result.success) {
		throw new Error(
			`Sandbox status command failed: ${result.stderr || result.stdout || 'unknown error'}`,
		)
	}
	const parsed = JSON.parse(result.stdout) as {
		ok: boolean
		status: number
		statusText: string
		body: string
	}
	if (!parsed.ok) {
		throw new Error(
			`Sandbox status request failed: ${parsed.status} ${parsed.statusText}`,
		)
	}
	return JSON.parse(parsed.body) as { activeJobs: number }
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
			let status: { activeJobs: number }
			try {
				status = await fetchAudioSandboxStatus({ env, sandbox })
			} catch (error) {
				await sandbox.setKeepAlive(false).catch(() => undefined)
				await sandbox.destroy().catch(() => undefined)
				const message = error instanceof Error ? error.message : String(error)
				return new Response(`Sandbox status failed: ${message}`, { status: 502 })
			}
			if (status.activeJobs > 0) {
				return Response.json({ ok: true, status: 'busy' })
			}
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
			const proxied = await proxyJobToAudioSandbox({
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
			return new Response(`Sandbox proxy failed: ${message}`, { status: 502 })
		}
	},
}
