import { z } from 'zod'
import { type Env } from './env'

const queueMessageSchema = z.object({
	draftId: z.string().trim().min(1),
	callAudioKey: z.string().trim().min(1),
	responseAudioKey: z.string().trim().min(1),
})

async function processMessage({ message, env }: { message: any; env: Env }) {
	const parsed = queueMessageSchema.parse(message.body)
	const attempt =
		typeof message.attempts === 'number' && Number.isFinite(message.attempts)
			? message.attempts
			: 1
	console.info('Call Kent audio queue message dequeued', {
		draftId: parsed.draftId,
		attempt,
	})
	const response = await fetch(
		`${env.CALL_KENT_AUDIO_SANDBOX_URL}/jobs/episode-audio`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.CALL_KENT_AUDIO_SANDBOX_TOKEN}`,
			},
			body: JSON.stringify({
				...parsed,
				attempt,
				callbackUrl: env.CALL_KENT_AUDIO_CALLBACK_URL,
				callbackSecret: env.CALL_KENT_AUDIO_CALLBACK_SECRET,
			}),
		},
	)
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`Sandbox request failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
	console.info('Call Kent audio sandbox request succeeded', {
		draftId: parsed.draftId,
		attempt,
		status: response.status,
	})
	return { draftId: parsed.draftId, attempt }
}

export default {
	async queue(batch: any, env: Env) {
		console.info('Call Kent audio queue batch received', {
			batchSize: batch.messages.length,
		})
		for (const message of batch.messages) {
			try {
				const { draftId, attempt } = await processMessage({ message, env })
				message.ack()
				console.info('Call Kent audio queue message acked', {
					draftId,
					attempt,
				})
			} catch (error) {
				console.error('Call Kent audio queue message failed', {
					draftId:
						typeof message.body?.draftId === 'string'
							? message.body.draftId
							: null,
					attempt:
						typeof message.attempts === 'number' &&
						Number.isFinite(message.attempts)
							? message.attempts
							: 1,
					error: error instanceof Error ? error.message : String(error),
				})
				message.retry()
			}
		}
	},
}
