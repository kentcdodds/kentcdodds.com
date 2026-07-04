import { data as json } from 'react-router'
import { CallKentTextToSpeech } from '#app/components/calls/call-kent-text-to-speech.tsx'
import {
	AI_VOICE_DISCLOSURE_PREFIX,
	getErrorForCallKentQuestionText,
	isCallKentTextToSpeechVoice,
} from '#app/utils/call-kent-text-to-speech.ts'
import { synthesizeSpeechWithWorkersAi } from '#app/utils/cloudflare-ai-text-to-speech.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { rateLimit } from '#app/utils/rate-limit.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/text-to-speech'

export { CallKentTextToSpeech }

const TTS_RATE_LIMIT_MAX = 20
const TTS_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

function normalizeQuestionText(text: string) {
	// Normalize input by trimming and collapsing consecutive whitespace.
	return text.trim().replace(/\s+/g, ' ')
}

function withAiDisclosurePrefix(text: string) {
	const cleaned = text.trim()
	if (!cleaned) return cleaned
	const prefixLower = AI_VOICE_DISCLOSURE_PREFIX.toLowerCase()
	if (cleaned.toLowerCase().startsWith(prefixLower)) return cleaned
	return `${AI_VOICE_DISCLOSURE_PREFIX} ${cleaned}`
}

function stripAiDisclosurePrefix(text: string) {
	const cleaned = text.trim()
	if (!cleaned) return cleaned
	const prefixLower = AI_VOICE_DISCLOSURE_PREFIX.toLowerCase()
	if (!cleaned.toLowerCase().startsWith(prefixLower)) return cleaned
	return cleaned.slice(AI_VOICE_DISCLOSURE_PREFIX.length).trimStart()
}

function isDataWithResponseInit(value: unknown): value is {
	type: 'DataWithResponseInit'
	data: unknown
	init: ResponseInit | null
} {
	return (
		!!value &&
		typeof value === 'object' &&
		(value as { type?: string }).type === 'DataWithResponseInit'
	)
}

export async function action({ request }: Route.ActionArgs) {
	// This is a paid API call; require auth to limit abuse.
	const headers = { 'Cache-Control': 'no-store', Vary: 'Cookie' }

	const user = await getUser(request)
	if (!user) {
		return json(
			{ error: 'Login required to generate audio.' },
			{ status: 401, headers },
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

	// Clients are not trusted to include the disclosure prefix, but if they do, we
	// strip it for validation so it can't satisfy min length by itself.
	const questionText = stripAiDisclosurePrefix(text)
	const normalizedQuestionText = normalizeQuestionText(questionText)
	const textError = getErrorForCallKentQuestionText(normalizedQuestionText)
	if (textError) {
		return json({ error: textError }, { status: 400, headers })
	}

	if (voiceRaw && !isCallKentTextToSpeechVoice(voiceRaw)) {
		return json({ error: 'Invalid voice' }, { status: 400, headers })
	}

	const speechText = withAiDisclosurePrefix(normalizedQuestionText)
	const model = getEnv().CLOUDFLARE_AI_TEXT_TO_SPEECH_MODEL

	try {
		// Intentionally consume quota before synthesis to cap paid API usage, even
		// when upstream calls fail.
		const limit = rateLimit({
			key: `call-kent-tts:${user.id}`,
			max: TTS_RATE_LIMIT_MAX,
			windowMs: TTS_RATE_LIMIT_WINDOW_MS,
		})
		if (!limit.allowed) {
			const retryAfterSeconds = Math.ceil((limit.retryAfterMs ?? 0) / 1000)
			return json(
				{
					error: `Too many text-to-speech requests. Try again in ${retryAfterSeconds}s.`,
				},
				{
					status: 429,
					headers: {
						...headers,
						'Retry-After': String(retryAfterSeconds),
					},
				},
			)
		}

		const { bytes, contentType } = await synthesizeSpeechWithWorkersAi({
			text: speechText,
			voice: voiceRaw || undefined,
			model,
		})
		// Some TS `fetch`/`Response` typings don't accept all `Uint8Array` variants.
		// Normalize into an `ArrayBuffer` body for broad compatibility.
		const responseBody =
			bytes.buffer instanceof ArrayBuffer
				? bytes.buffer.slice(
						bytes.byteOffset,
						bytes.byteOffset + bytes.byteLength,
					)
				: Uint8Array.from(bytes).buffer
		const responseContentType = contentType || 'audio/mpeg'
		return new Response(responseBody, {
			headers: {
				...headers,
				'Content-Type': responseContentType,
			},
		})
	} catch (error: unknown) {
		if (error instanceof Response) {
			return error
		}
		if (isDataWithResponseInit(error)) {
			return error
		}
		console.error('Call Kent TTS failed', error)
		return json(
			{ error: 'Unable to generate audio. Please try again.' },
			{ status: 500, headers },
		)
	}
}
