import {
	getAudioBuffer,
	putEpisodeDraftAudioFromBuffer,
	putEpisodeDraftCallerSegmentAudioFromBuffer,
	putEpisodeDraftResponseSegmentAudioFromBuffer,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { handleCallKentAudioProcessorEvent } from '#app/utils/call-kent-audio-processor-callback.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { createEpisodeAudio } from '#app/utils/ffmpeg.server.ts'
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

async function runMockLocalEpisodeAudioJob({
	draftId,
	callAudioKey,
	responseAudioKey,
}: EpisodeAudioJob) {
	try {
		await handleCallKentAudioProcessorEvent({
			type: 'audio_generation_started',
			draftId,
		})
		const [callAudio, responseAudio] = await Promise.all([
			getAudioBuffer({ key: callAudioKey }),
			getAudioBuffer({ key: responseAudioKey }),
		])
		const generated = await createEpisodeAudio(callAudio, responseAudio)
		const [episodeStored, callerStored, responseStored] = await Promise.all([
			putEpisodeDraftAudioFromBuffer({
				draftId,
				mp3: generated.episodeMp3,
			}),
			putEpisodeDraftCallerSegmentAudioFromBuffer({
				draftId,
				mp3: generated.callerMp3,
			}),
			putEpisodeDraftResponseSegmentAudioFromBuffer({
				draftId,
				mp3: generated.responseMp3,
			}),
		])
		await handleCallKentAudioProcessorEvent({
			type: 'audio_generation_completed',
			draftId,
			episodeAudioKey: episodeStored.key,
			episodeAudioContentType: episodeStored.contentType,
			episodeAudioSize: episodeStored.size,
			callerSegmentAudioKey: callerStored.key,
			responseSegmentAudioKey: responseStored.key,
		})
	} catch (error: unknown) {
		await handleCallKentAudioProcessorEvent({
			type: 'audio_generation_failed',
			draftId,
			errorMessage: getErrorMessage(error),
		})
	}
}

export async function requestCallKentEpisodeAudioGeneration({
	draftId,
	callAudioKey,
	responseAudioKey,
}: EpisodeAudioJob) {
	const mode = getEnv().CALL_KENT_AUDIO_PROCESSOR_MODE
	switch (mode) {
		case 'mock-local': {
			// Keep mock-local async like cloudflare mode: the caller should return
			// immediately while status changes are written via callback handlers.
			void runMockLocalEpisodeAudioJob({
				draftId,
				callAudioKey,
				responseAudioKey,
			})
			return
		}
		case 'cloudflare': {
			await enqueueCallKentEpisodeAudioJobToCloudflare({
				draftId,
				callAudioKey,
				responseAudioKey,
			})
			return
		}
		default: {
			throw new Error(`Unsupported CALL_KENT_AUDIO_PROCESSOR_MODE: ${mode}`)
		}
	}
}
