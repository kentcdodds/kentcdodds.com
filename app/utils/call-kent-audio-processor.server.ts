import { Buffer } from 'node:buffer'
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
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	})
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
		if (parsed.success === false) {
			throw new Error('Cloudflare queue enqueue failed: success=false')
		}
	}
}

async function generateFallbackEpisodeAudio({
	callAudio,
	responseAudio,
}: {
	callAudio: Buffer
	responseAudio: Buffer
}) {
	// Keep mock-local processing resilient if ffmpeg is unavailable.
	const callerMp3 = Buffer.from(callAudio)
	const responseMp3 = Buffer.from(responseAudio)
	const episodeMp3 = Buffer.concat([callerMp3, responseMp3])
	return { callerMp3, responseMp3, episodeMp3 }
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
		const generated = await createEpisodeAudio(callAudio, responseAudio).catch(
			async () =>
				generateFallbackEpisodeAudio({
					callAudio,
					responseAudio,
				}),
		)
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
	if (mode === 'mock-local') {
		void runMockLocalEpisodeAudioJob({
			draftId,
			callAudioKey,
			responseAudioKey,
		})
		return
	}
	await enqueueCallKentEpisodeAudioJobToCloudflare({
		draftId,
		callAudioKey,
		responseAudioKey,
	})
}
