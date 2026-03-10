import { getEnv } from '#app/utils/env.server.ts'
import { getErrorMessage } from '#app/utils/misc.ts'

type EpisodeAudioJob = {
	draftId: string
	callAudioKey: string
	responseAudioKey: string
	callTitle: string
	callerNotes: string | null
	callerName: string | null
	savedCallerTranscript: string | null
}

const cloudflareWorkflowStartTimeoutMs = 10_000

async function startCallKentEpisodeAudioWorkflow({
	draftId,
	callAudioKey,
	responseAudioKey,
	callTitle,
	callerNotes,
	callerName,
	savedCallerTranscript,
}: EpisodeAudioJob) {
	const env = getEnv()
	const workflowName = env.CALL_KENT_AUDIO_CF_WORKFLOW_NAME
	if (!workflowName) {
		throw new Error('CALL_KENT_AUDIO_CF_WORKFLOW_NAME is required.')
	}
	const url = `${env.CALL_KENT_AUDIO_CF_API_BASE_URL}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workflows/${workflowName}/instances`
	const body = {
		instance_id: draftId,
		params: {
			draftId,
			callAudioKey,
			responseAudioKey,
			callTitle,
			callerNotes,
			callerName,
			savedCallerTranscript,
			cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
		},
	}
	let res: Response
	try {
		res = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(cloudflareWorkflowStartTimeoutMs),
		})
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			(error.name === 'AbortError' || error.name === 'TimeoutError')
		) {
			throw new Error(
				`Cloudflare workflow start timed out after ${cloudflareWorkflowStartTimeoutMs}ms`,
			)
		}
		throw new Error(
			`Cloudflare workflow start failed: ${getErrorMessage(error)}`,
		)
	}
	let text: string
	try {
		text = await res.text()
	} catch (error: unknown) {
		throw new Error(
			`Cloudflare workflow start failed: unable to read response body: ${getErrorMessage(error)}`,
		)
	}
	if (!res.ok) {
		throw new Error(
			`Cloudflare workflow start failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`,
		)
	}
	if (!text.trim()) {
		throw new Error('Cloudflare workflow start failed: empty response')
	}
	let parsed: unknown
	try {
		parsed = JSON.parse(text)
	} catch {
		throw new Error('Cloudflare workflow start failed: invalid JSON response')
	}
	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error(
			'Cloudflare workflow start failed: response must include success=true',
		)
	}
	const parsedRecord = parsed as { success?: unknown }
	if (parsedRecord.success !== true) {
		throw new Error(
			'Cloudflare workflow start failed: response must include success=true',
		)
	}
}

export async function requestCallKentEpisodeAudioGeneration({
	draftId,
	callAudioKey,
	responseAudioKey,
	callTitle,
	callerNotes,
	callerName,
	savedCallerTranscript,
}: EpisodeAudioJob) {
	await startCallKentEpisodeAudioWorkflow({
		draftId,
		callAudioKey,
		responseAudioKey,
		callTitle,
		callerNotes,
		callerName,
		savedCallerTranscript,
	})
}
