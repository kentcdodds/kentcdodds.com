import { getEnv } from '#app/utils/env.server.ts'
import { getErrorMessage } from '#app/utils/misc.ts'

type EpisodeAudioJob = {
	draftId: string
	callAudioKey: string
	responseAudioKey: string
}

const cloudflareQueueEnqueueTimeoutMs = 10_000

async function enqueueCallKentEpisodeAudioJobToCloudflare({
	draftId,
	callAudioKey,
	responseAudioKey,
}: EpisodeAudioJob) {
	const env = getEnv()
	const queueId = env.CALL_KENT_AUDIO_CF_QUEUE_ID
	if (!queueId) {
		throw new Error('CALL_KENT_AUDIO_CF_QUEUE_ID is required.')
	}
	const url = `${env.CALL_KENT_AUDIO_CF_API_BASE_URL}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/queues/${queueId}/messages`
	const body = {
		content_type: 'json',
		body: {
			draftId,
			callAudioKey,
			responseAudioKey,
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
			signal: AbortSignal.timeout(cloudflareQueueEnqueueTimeoutMs),
		})
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			(error.name === 'AbortError' || error.name === 'TimeoutError')
		) {
			throw new Error(
				`Cloudflare queue enqueue timed out after ${cloudflareQueueEnqueueTimeoutMs}ms`,
			)
		}
		throw new Error(
			`Cloudflare queue enqueue failed: ${getErrorMessage(error)}`,
		)
	}
	const text = await res.text().catch(() => '')
	if (!res.ok) {
		throw new Error(
			`Cloudflare queue enqueue failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`,
		)
	}
	if (text) {
		let parsed: { success?: boolean } | null = null
		try {
			parsed = JSON.parse(text) as { success?: boolean }
		} catch {
			throw new Error('Cloudflare queue enqueue failed: invalid JSON response')
		}
		if (parsed?.success === false) {
			throw new Error('Cloudflare queue enqueue failed: success=false')
		}
	}
}

export async function requestCallKentEpisodeAudioGeneration({
	draftId,
	callAudioKey,
	responseAudioKey,
}: EpisodeAudioJob) {
	await enqueueCallKentEpisodeAudioJobToCloudflare({
		draftId,
		callAudioKey,
		responseAudioKey,
	})
}
