import { z } from 'zod'
import {
	sendCallKentAudioProcessorCallback,
} from './call-kent-audio-callback'
import { createSignedEpisodeAudioUrls } from './call-kent-audio-r2'
import {
	isRetryableSandboxStartupError,
	runCallKentAudioSandboxJob,
} from './call-kent-audio-sandbox'
import { type Env } from './env'

export { Sandbox } from '@cloudflare/sandbox'

const queueMessageSchema = z.object({
	draftId: z.string().trim().min(1),
	callAudioKey: z.string().trim().min(1),
	responseAudioKey: z.string().trim().min(1),
})

type QueueMessage = {
	body: unknown
	attempts?: number
	ack: () => void
	retry: () => void
}

type QueueBatch = {
	messages: Array<QueueMessage>
}

function getDraftIdFromMessageBody(body: unknown) {
	return typeof (body as { draftId?: unknown })?.draftId === 'string'
		? (body as { draftId: string }).draftId
		: null
}

function getAttempt(message: QueueMessage) {
	return typeof message.attempts === 'number' && Number.isFinite(message.attempts)
		? message.attempts
		: 1
}

function createSandboxId(draftId: string) {
	const compactDraftId = draftId.replaceAll('-', '').slice(0, 12)
	const randomSuffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12)
	return `call-kent-${compactDraftId}-${randomSuffix}`
}

export async function processMessage({
	message,
	env,
	sendCallback = sendCallKentAudioProcessorCallback,
	createSignedUrls = createSignedEpisodeAudioUrls,
	runSandboxJob = runCallKentAudioSandboxJob,
}: {
	message: QueueMessage
	env: Env
	sendCallback?: typeof sendCallKentAudioProcessorCallback
	createSignedUrls?: typeof createSignedEpisodeAudioUrls
	runSandboxJob?: typeof runCallKentAudioSandboxJob
}) {
	const attempt = getAttempt(message)
	let draftId = getDraftIdFromMessageBody(message.body)

	try {
		const parsed = queueMessageSchema.parse(message.body)
		draftId = parsed.draftId
		console.info('Call Kent audio queue message dequeued', {
			draftId: parsed.draftId,
			attempt,
		})
		await sendCallback({
			callbackUrl: env.CALL_KENT_AUDIO_CALLBACK_URL,
			callbackSecret: env.CALL_KENT_AUDIO_CALLBACK_SECRET,
			event: {
				type: 'audio_generation_started',
				draftId: parsed.draftId,
				attempt,
			},
		})
		const signedUrls = await createSignedUrls({
			env,
			draftId: parsed.draftId,
			callAudioKey: parsed.callAudioKey,
			responseAudioKey: parsed.responseAudioKey,
		})
		const completed = await runSandboxJob({
			binding: env.Sandbox,
			sandboxId: createSandboxId(parsed.draftId),
			request: {
				draftId: parsed.draftId,
				attempt,
				callAudioUrl: signedUrls.callAudioUrl,
				responseAudioUrl: signedUrls.responseAudioUrl,
				episodeUploadUrl: signedUrls.episodeUploadUrl,
				callerSegmentUploadUrl: signedUrls.callerSegmentUploadUrl,
				responseSegmentUploadUrl: signedUrls.responseSegmentUploadUrl,
			},
		})
		await sendCallback({
			callbackUrl: env.CALL_KENT_AUDIO_CALLBACK_URL,
			callbackSecret: env.CALL_KENT_AUDIO_CALLBACK_SECRET,
			event: {
				type: 'audio_generation_completed',
				draftId: parsed.draftId,
				episodeAudioKey: signedUrls.episodeAudioKey,
				episodeAudioContentType: 'audio/mpeg',
				episodeAudioSize: completed.episodeAudioSize,
				callerSegmentAudioKey: signedUrls.callerSegmentAudioKey,
				responseSegmentAudioKey: signedUrls.responseSegmentAudioKey,
				attempt,
			},
		})
		console.info('Call Kent audio sandbox job completed', {
			draftId: parsed.draftId,
			attempt,
			episodeAudioKey: signedUrls.episodeAudioKey,
		})
		return { draftId: parsed.draftId, attempt }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		if (draftId && !isRetryableSandboxStartupError(error)) {
			await sendCallback({
				callbackUrl: env.CALL_KENT_AUDIO_CALLBACK_URL,
				callbackSecret: env.CALL_KENT_AUDIO_CALLBACK_SECRET,
				event: {
					type: 'audio_generation_failed',
					draftId,
					errorMessage,
					attempt,
				},
			}).catch((callbackError: unknown) => {
				console.error('Failed to send audio generation failed callback', {
					draftId,
					attempt,
					error:
						callbackError instanceof Error
							? callbackError.message
							: String(callbackError),
				})
			})
		}
		throw error
	}
}

export async function handleQueueBatch({
	batch,
	env,
	sendCallback,
	createSignedUrls,
	runSandboxJob,
}: {
	batch: QueueBatch
	env: Env
	sendCallback?: typeof sendCallKentAudioProcessorCallback
	createSignedUrls?: typeof createSignedEpisodeAudioUrls
	runSandboxJob?: typeof runCallKentAudioSandboxJob
}) {
	console.info('Call Kent audio queue batch received', {
		batchSize: batch.messages.length,
	})
	for (const message of batch.messages) {
		try {
			const { draftId, attempt } = await processMessage({
				message,
				env,
				sendCallback,
				createSignedUrls,
				runSandboxJob,
			})
			message.ack()
			console.info('Call Kent audio queue message acked', {
				draftId,
				attempt,
			})
		} catch (error) {
			console.error('Call Kent audio queue message failed', {
				draftId: getDraftIdFromMessageBody(message.body),
				attempt: getAttempt(message),
				error: error instanceof Error ? error.message : String(error),
			})
			message.retry()
		}
	}
}

export default {
	async queue(batch: QueueBatch, env: Env) {
		await handleQueueBatch({ batch, env })
	},
}
