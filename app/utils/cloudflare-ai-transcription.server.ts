type WhisperTranscriptionResponse = {
	text: string
	// Other fields exist (words/vtt/etc) but we only need `text` for Transistor.
}

import { Buffer } from 'node:buffer'
import { getWorkersAiRunUrl } from './cloudflare-ai-utils.server.ts'
import { getEnv } from './env.server.ts'

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
	 * Default/recommended: `@cf/openai/whisper` because it supports raw binary
	 * audio via the REST API. `@cf/openai/whisper-large-v3-turbo` typically
	 * expects base64, which is more memory-heavy.
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
	if (isWhisperLargeV3Turbo && !env.CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64) {
		throw new Error(
			`Transcription model "${model}" requires base64 payloads. Set CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64=true to acknowledge higher memory usage, or switch to @cf/openai/whisper for binary audio payloads.`,
		)
	}
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
			'cf-aig-authorization': `Bearer ${env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN}`,
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
