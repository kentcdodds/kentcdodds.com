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
	const response = await fetch(
		`${env.CALL_KENT_AUDIO_CONTAINER_URL}/jobs/episode-audio`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.CALL_KENT_AUDIO_CONTAINER_TOKEN}`,
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
			`Container request failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
}

export default {
	async queue(batch: any, env: Env) {
		for (const message of batch.messages) {
			try {
				await processMessage({ message, env })
				message.ack()
			} catch (error) {
				console.error('Call Kent audio queue message failed', {
					error: error instanceof Error ? error.message : String(error),
				})
				message.retry()
			}
		}
	},
}
