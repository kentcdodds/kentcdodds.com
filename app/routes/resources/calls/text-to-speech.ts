import { data as json } from 'react-router'
import {
	isCloudflareTextToSpeechConfigured,
	synthesizeSpeechWithWorkersAi,
} from '#app/utils/cloudflare-ai-text-to-speech.server.ts'
import {
	getErrorForCallKentQuestionText,
	isCallKentTextToSpeechVoice,
} from '#app/utils/call-kent-text-to-speech.ts'
import { requireUser } from '#app/utils/session.server.ts'
import  { type Route } from './+types/text-to-speech'

export async function action({ request }: Route.ActionArgs) {
	// This is a paid API call; require auth to limit abuse.
	await requireUser(request)

	const headers = { 'Cache-Control': 'no-store' }

	if (!isCloudflareTextToSpeechConfigured()) {
		return json(
			{
				error:
					'Text-to-speech is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (and optionally CLOUDFLARE_AI_TEXT_TO_SPEECH_MODEL).',
			},
			{ status: 503, headers },
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400, headers })
	}

	const text = typeof (body as any)?.text === 'string' ? (body as any).text : ''
	const voiceRaw =
		typeof (body as any)?.voice === 'string' ? (body as any).voice : ''

	const textError = getErrorForCallKentQuestionText(text)
	if (textError) {
		return json({ error: textError }, { status: 400, headers })
	}

	if (voiceRaw && !isCallKentTextToSpeechVoice(voiceRaw)) {
		return json({ error: 'Invalid voice' }, { status: 400, headers })
	}

	try {
		const { bytes, contentType } = await synthesizeSpeechWithWorkersAi({
			text: text.trim(),
			voice: voiceRaw || undefined,
		})
		// Some TS `fetch`/`Response` typings don't accept all `Uint8Array` variants.
		// Normalize into an `ArrayBuffer` body for broad compatibility.
		const body =
			bytes.buffer instanceof ArrayBuffer
				? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
				: Uint8Array.from(bytes).buffer
		return new Response(body, {
			headers: {
				...headers,
				'Content-Type': contentType || 'audio/mpeg',
			},
		})
	} catch (error: unknown) {
		console.error('Call Kent TTS failed', error)
		return json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Unable to generate audio. Please try again.',
			},
			{ status: 500, headers },
		)
	}
}

