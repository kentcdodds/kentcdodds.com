import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, eq, inList } from '@remix-run/data-table'
import { z } from 'zod'
import { startCallKentEpisodeDraftProcessing } from '#app/utils/call-kent-episode-draft.server.ts'
import { db } from '#app/utils/db.server.ts'
import { callKentEpisodeDraftTable } from '#app/utils/db/schema.server.ts'
import { getEnv } from '#app/utils/env.server.ts'

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
			await db.updateMany(
				callKentEpisodeDraftTable,
				{ step: 'GENERATING_AUDIO', errorMessage: null },
				{
					where: and(
						eq('id', event.draftId),
						eq('status', 'PROCESSING'),
						inList('step', ['STARTED', 'GENERATING_AUDIO']),
					),
				},
			)
			return
		}
		case 'audio_generation_completed': {
			const updated = await db.updateMany(
				callKentEpisodeDraftTable,
				{
					episodeAudioKey: event.episodeAudioKey,
					episodeAudioContentType: event.episodeAudioContentType,
					episodeAudioSize: event.episodeAudioSize,
					callerSegmentAudioKey: event.callerSegmentAudioKey ?? null,
					responseSegmentAudioKey: event.responseSegmentAudioKey ?? null,
					step: 'TRANSCRIBING',
					errorMessage: null,
				},
				{
					where: and(
						eq('id', event.draftId),
						eq('status', 'PROCESSING'),
						inList('step', ['STARTED', 'GENERATING_AUDIO']),
					),
				},
			)
			if (updated.affectedRows !== 1) return
			void startCallKentEpisodeDraftProcessing(event.draftId)
			return
		}
		case 'audio_generation_failed': {
			await db.updateMany(
				callKentEpisodeDraftTable,
				{
					status: 'ERROR',
					step: 'DONE',
					errorMessage: event.errorMessage,
				},
				{ where: { id: event.draftId, status: 'PROCESSING' } },
			)
			return
		}
		default: {
			const _exhaustive: never = event
			throw new Error(`Unhandled event type: ${(_exhaustive as { type: string }).type}`)
		}
	}
}
