import { createHmac } from 'node:crypto'
import { z } from 'zod'

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

export async function sendCallKentAudioProcessorCallback({
	callbackUrl,
	callbackSecret,
	event,
}: {
	callbackUrl: string
	callbackSecret: string
	event: CallKentAudioProcessorEvent
}) {
	const body = JSON.stringify(callKentAudioProcessorEventSchema.parse(event))
	const timestamp = Math.floor(Date.now() / 1000).toString()
	const signature = createCallKentAudioProcessorSignature({
		secret: callbackSecret,
		timestamp,
		rawBody: body,
	})
	const response = await fetch(callbackUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-call-kent-audio-timestamp': timestamp,
			'x-call-kent-audio-signature': signature,
		},
		body,
		signal: AbortSignal.timeout(10_000),
	})
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`Callback failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
}
