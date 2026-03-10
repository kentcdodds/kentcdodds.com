import { getSandbox, type Sandbox as SandboxBinding } from '@cloudflare/sandbox'
import { z } from 'zod'

const sandboxExecTimeoutMs = 30 * 60_000

const sandboxExecResponseSchema = z.object({
	episodeAudioSize: z.number().int().positive(),
	callerSegmentAudioSize: z.number().int().positive(),
	responseSegmentAudioSize: z.number().int().positive(),
})

export type CallKentAudioSandboxRequest = {
	draftId: string
	attempt: number
	callAudioUrl: string
	responseAudioUrl: string
	episodeUploadUrl: string
	callerSegmentUploadUrl: string
	responseSegmentUploadUrl: string
}

type SandboxExecResult = {
	success: boolean
	stdout: string
	stderr: string
	exitCode?: number | null
}

type SandboxLike = {
	exec: (
		command: string,
		options: { env: Record<string, string>; timeout: number },
	) => Promise<SandboxExecResult>
	destroy: () => Promise<void>
}

function getSandboxOutput(stdout: string) {
	const trimmed = stdout.trim()
	if (!trimmed) {
		throw new Error('Sandbox returned empty stdout')
	}
	return sandboxExecResponseSchema.parse(JSON.parse(trimmed))
}

export function createSandboxCommandEnvironment(
	request: CallKentAudioSandboxRequest,
) {
	return {
		CALL_KENT_AUDIO_DRAFT_ID: request.draftId,
		CALL_KENT_AUDIO_ATTEMPT: String(request.attempt),
		CALL_AUDIO_URL: request.callAudioUrl,
		RESPONSE_AUDIO_URL: request.responseAudioUrl,
		EPISODE_UPLOAD_URL: request.episodeUploadUrl,
		CALLER_SEGMENT_UPLOAD_URL: request.callerSegmentUploadUrl,
		RESPONSE_SEGMENT_UPLOAD_URL: request.responseSegmentUploadUrl,
	}
}

export async function runCallKentAudioSandboxJob({
	binding,
	sandboxId,
	request,
	getSandboxImpl = getSandbox,
}: {
	binding: DurableObjectNamespace<SandboxBinding>
	sandboxId: string
	request: CallKentAudioSandboxRequest
	getSandboxImpl?: typeof getSandbox
}) {
	const sandbox = getSandboxImpl(binding, sandboxId) as unknown as SandboxLike
	try {
		const result = await sandbox.exec('/usr/local/bin/call-kent-audio-cli', {
			env: createSandboxCommandEnvironment(request),
			timeout: sandboxExecTimeoutMs,
		})
		if (!result.success) {
			throw new Error(
				`Sandbox exec failed with exit code ${String(result.exitCode ?? 'unknown')}: ${result.stderr || result.stdout || 'no output'}`,
			)
		}
		return getSandboxOutput(result.stdout)
	} finally {
		await sandbox.destroy().catch((error: unknown) => {
			console.warn('Failed to destroy Call Kent audio sandbox', {
				draftId: request.draftId,
				error: error instanceof Error ? error.message : String(error),
			})
		})
	}
}
