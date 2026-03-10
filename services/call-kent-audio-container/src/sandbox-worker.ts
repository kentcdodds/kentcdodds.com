import { timingSafeEqual } from 'node:crypto'
import { getSandbox } from '@cloudflare/sandbox'
import { z } from 'zod'

export { Sandbox as CallKentAudioSandbox } from '@cloudflare/sandbox'

const sandboxJobCommand = 'node src/index.ts'

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

const jobRequestSchema = z.object({
	draftId: z.string().trim().min(1),
	callAudioKey: z.string().trim().min(1),
	responseAudioKey: z.string().trim().min(1),
	callbackUrl: z.url(),
	callbackSecret: z.string().trim().min(1),
	attempt: z.number().int().positive().optional(),
})

function getAudioSandboxForDraft({
	env,
	draftId,
}: {
	env: Env
	draftId: string
}) {
	// One sandbox per draft keeps jobs isolated and removes custom lifecycle logic.
	return getSandbox(env.AUDIO_SANDBOX, `call-kent-audio-${draftId}`)
}

function getAudioSandboxEnvVarsForJob({
	env,
	jobRequestBody,
}: {
	env: Env
	jobRequestBody: string
}) {
	return {
		R2_ENDPOINT: env.R2_ENDPOINT,
		R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
		R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
		CALL_KENT_R2_BUCKET: env.CALL_KENT_R2_BUCKET,
		CALL_KENT_AUDIO_JOB_REQUEST_BODY: jobRequestBody,
	}
}

function parseJobRequest(body: string) {
	let parsedBody: unknown
	try {
		parsedBody = JSON.parse(body)
	} catch {
		throw new Error('Invalid JSON body')
	}
	return jobRequestSchema.parse(parsedBody)
}

async function startAudioSandboxJobProcess({
	env,
	jobRequestBody,
	draftId,
}: {
	env: Env
	jobRequestBody: string
	draftId: string
}) {
	const sandbox = getAudioSandboxForDraft({ env, draftId })
	const runningProcesses = await sandbox.listProcesses()
	const existingJobProcess = runningProcesses.find(
		(process) => process.command === sandboxJobCommand,
	)
	if (existingJobProcess) {
		return 'already-running' as const
	}
	await sandbox.startProcess(sandboxJobCommand, {
		cwd: '/app',
		env: getAudioSandboxEnvVarsForJob({ env, jobRequestBody }),
	})
	return 'started' as const
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url)
		if (url.pathname !== '/jobs/episode-audio') {
			return new Response('Not found', { status: 404 })
		}

		if (!isAuthorized(request, env)) {
			return new Response('Unauthorized', { status: 401 })
		}

		try {
			const body = await request.text()
			const job = parseJobRequest(body)
			const started = await startAudioSandboxJobProcess({
				env,
				jobRequestBody: body,
				draftId: job.draftId,
			})
			return Response.json({
				ok: true,
				status: started,
				draftId: job.draftId,
			}, { status: 202 })
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			const isClientInputError =
				error instanceof z.ZodError || message === 'Invalid JSON body'
			return new Response(`Sandbox job start failed: ${message}`, {
				status: isClientInputError ? 400 : 502,
			})
		}
	},
}
