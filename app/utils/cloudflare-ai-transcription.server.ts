type WhisperTranscriptionResponse = {
	text: string
	// Other fields exist (words/vtt/etc) but we only need `text` for Transistor.
}

import { Buffer } from 'node:buffer'
import { getEnv } from './env.server.ts'

function getWorkersAiRunUrl(model: string) {
	// Cloudflare's REST route expects the model as path segments (with `/`), so do
	// not URL-encode the model string (encoding can yield "No route for that URI").
	const env = getEnv()
	return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_GATEWAY_ID}/workers-ai/${model}`
}

export async function transcribeMp3WithWorkersAi({
	mp3,
	callerName,
	callTitle,
	callerNotes,
	model = getEnv().CLOUDFLARE_AI_TRANSCRIPTION_MODEL,
}: {
	// Accept Buffers and other Uint8Array views.
	mp3: Uint8Array
	/**
	 * Optional; used as transcription context (not as a source of facts).
	 * Only pass for non-anonymous callers.
	 */
	callerName?: string
	/**
	 * Optional; extra context to reduce proper-noun hallucinations.
	 * Only include if it reflects real caller-provided info.
	 */
	callTitle?: string
	/**
	 * Optional; extra context to reduce proper-noun hallucinations.
	 * Only include if it reflects real caller-provided info.
	 */
	callerNotes?: string
	/**
	 * Recommended: `@cf/openai/whisper` because it supports raw binary audio via
	 * the REST API. `@cf/openai/whisper-large-v3-turbo` typically expects base64,
	 * which is more memory-heavy.
	 */
	model?: string
}): Promise<string> {
	const env = getEnv()
	const apiToken = env.CLOUDFLARE_API_TOKEN
	const url = getWorkersAiRunUrl(model)

	// Some TS `fetch` typings only accept `ArrayBufferView` backed by `ArrayBuffer`
	// (not `ArrayBufferLike`). Convert to an `ArrayBuffer`-backed view without
	// copying when possible.
	const mp3Body =
		mp3.buffer instanceof ArrayBuffer
			? new Uint8Array(mp3.buffer, mp3.byteOffset, mp3.byteLength)
			: Uint8Array.from(mp3)

	const isWhisperLargeV3Turbo = model.includes('whisper-large-v3-turbo')
	const body = isWhisperLargeV3Turbo
		? JSON.stringify({
				// `whisper-large-v3-turbo` expects base64 in the JSON payload.
				// Docs: https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/
				audio: Buffer.from(mp3Body).toString('base64'),
				language: 'en',
				vad_filter: true,
				// Add a little context for proper nouns/domains we care about.
				initial_prompt: `
This is the Call Kent Podcast hosted by Kent C. Dodds. It starts with an intro from an "announcer" and then leads into the caller's call which is a question or discussion topic. Then there is a short interlude from the announcer. Then Kent gives his response. Then there is an outro from the announcer.
Canonical website domain: kentcdodds.com
Canonical calls page: kentcdodds.com/calls
${callTitle?.trim() ? `Episode title: ${callTitle.trim()}` : ''}
${callerNotes?.trim() ? `Caller notes: ${callerNotes.trim()}` : ''}
Proper nouns:
- Kent C. Dodds
${callerName ? `- ${callerName}` : ''}
`.trim(),
			})
		: mp3Body

	// For `@cf/openai/whisper`, Cloudflare supports raw binary audio as the body.
	// Docs: https://developers.cloudflare.com/workers-ai/models/whisper/
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': isWhisperLargeV3Turbo ? 'application/json' : 'audio/mpeg',
		},
		body,
	})

	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(
			`Cloudflare Workers AI transcription failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`,
		)
	}

	const json = (await res.json()) as any
	// REST responses typically wrap in { result: ... }, but keep it flexible.
	const result: WhisperTranscriptionResponse = (json?.result ?? json) as any
	if (!result?.text || typeof result.text !== 'string') {
		throw new Error(`Unexpected transcription response shape from Workers AI`)
	}

	return result.text
}
