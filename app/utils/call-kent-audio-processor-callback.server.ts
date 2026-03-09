import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { startCallKentEpisodeDraftProcessing } from '#app/utils/call-kent-episode-draft.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'

const audioGenerationStartedEventSchema = z.object({
	type: z.literal('audio_generation_started'),
	draftId: z.string().trim().min(1),
	attempt: z.number().int().positive().optional(),
})

const audioGenerationCompletedEventSchema = z.object({
	type: z.literal('audio_generation_completed'),
	draftId: z.string().trim().min(1),
	episodeAudioKey: z.string().trim().min(1),
	episodeAudioContentType: z.string().trim().min(1),
	episodeAudioSize: z.number().int().positive(),
	callerSegmentAudioKey: z.string().trim().min(1).optional().nullable(),
	responseSegmentAudioKey: z.string().trim().min(1).optional().nullable(),
	attempt: z.number().int().positive().optional(),
})

const audioGenerationFailedEventSchema = z.object({
	type: z.literal('audio_generation_failed'),
	draftId: z.string().trim().min(1),
	errorMessage: z.string().trim().min(1),
	attempt: z.number().int().positive().optional(),
})

const callKentAudioProcessorEventSchema = z.discriminatedUnion('type', [
	audioGenerationStartedEventSchema,
	audioGenerationCompletedEventSchema,
	audioGenerationFailedEventSchema,
])

export type CallKentAudioProcessorEvent = z.infer<
	typeof callKentAudioProcessorEventSchema
>

function createCallKentAudioProcessorSignature({
	secret,
	timestamp,
	rawBody,
}: {
	secret: string
	timestamp: string
	rawBody: string
}) {
	return createHmac('sha256', secret)
		.update(`${timestamp}.${rawBody}`, 'utf8')
		.digest('hex')
}

function safeEqualHex(a: string, b: string) {
	if (a.length % 2 !== 0 || b.length % 2 !== 0) return false
	const aBuffer = Buffer.from(a, 'hex')
	const bBuffer = Buffer.from(b, 'hex')
	if (aBuffer.length !== bBuffer.length) return false
	return timingSafeEqual(aBuffer, bBuffer)
}

export function parseCallKentAudioProcessorEvent(payload: unknown) {
	return callKentAudioProcessorEventSchema.parse(payload)
}

export function verifyCallKentAudioProcessorCallbackSignature({
	timestamp,
	signature,
	rawBody,
	now = Date.now(),
	maxSkewSeconds = 300,
}: {
	timestamp: string
	signature: string
	rawBody: string
	now?: number
	maxSkewSeconds?: number
}) {
	const secret = getEnv().CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET
	if (!secret) {
		throw new Error('CALL_KENT_AUDIO_PROCESSOR_CALLBACK_SECRET is required.')
	}
	const timestampNumber = Number(timestamp)
	if (!Number.isFinite(timestampNumber)) return false
	if (Math.abs(now - timestampNumber * 1000) > maxSkewSeconds * 1000) {
		return false
	}

	const expected = createCallKentAudioProcessorSignature({
		secret,
		timestamp,
		rawBody,
	})
	if (!/^[\da-f]+$/i.test(signature) || signature.length % 2 !== 0) return false
	return safeEqualHex(expected, signature)
}

export async function handleCallKentAudioProcessorEvent(
	event: CallKentAudioProcessorEvent,
) {
	switch (event.type) {
		case 'audio_generation_started': {
			await prisma.callKentEpisodeDraft.updateMany({
				where: {
					id: event.draftId,
					status: 'PROCESSING',
					step: { in: ['STARTED', 'GENERATING_AUDIO'] },
				},
				data: { step: 'GENERATING_AUDIO', errorMessage: null },
			})
			return
		}
		case 'audio_generation_completed': {
			const updated = await prisma.callKentEpisodeDraft.updateMany({
				where: {
					id: event.draftId,
					status: 'PROCESSING',
					step: { in: ['STARTED', 'GENERATING_AUDIO'] },
				},
				data: {
					episodeAudioKey: event.episodeAudioKey,
					episodeAudioContentType: event.episodeAudioContentType,
					episodeAudioSize: event.episodeAudioSize,
					callerSegmentAudioKey: event.callerSegmentAudioKey ?? null,
					responseSegmentAudioKey: event.responseSegmentAudioKey ?? null,
					step: 'TRANSCRIBING',
					errorMessage: null,
				},
			})
			if (updated.count !== 1) return
			void startCallKentEpisodeDraftProcessing(event.draftId)
			return
		}
		case 'audio_generation_failed': {
			await prisma.callKentEpisodeDraft.updateMany({
				where: { id: event.draftId, status: 'PROCESSING' },
				data: {
					status: 'ERROR',
					step: 'DONE',
					errorMessage: event.errorMessage,
				},
			})
			return
		}
	}
}
