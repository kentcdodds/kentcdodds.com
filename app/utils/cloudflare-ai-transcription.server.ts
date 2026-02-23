type WhisperTranscriptionResponse = {
	text: string
	// Other fields exist (words/vtt/etc) but we only need `text` for Transistor.
}

import { getEnv } from './env.server.ts'

function getCloudflareApiBaseUrl() {
	return 'https://api.cloudflare.com/client/v4'
}

export function isCloudflareTranscriptionConfigured() {
	const env = getEnv()
	return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN)
}

export async function transcribeMp3WithWorkersAi({
	mp3,
	model = getEnv().CLOUDFLARE_AI_TRANSCRIPTION_MODEL,
}: {
	// Accept Buffers and other Uint8Array views.
	mp3: Uint8Array
	/**
	 * Recommended: `@cf/openai/whisper` because it supports raw binary audio via
	 * the REST API. `@cf/openai/whisper-large-v3-turbo` typically expects base64,
	 * which is more memory-heavy.
	 */
	model?: string
}): Promise<string> {
	const env = getEnv()
	const accountId = env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = env.CLOUDFLARE_API_TOKEN
	if (!accountId || !apiToken) {
		throw new Error(
			'Cloudflare Workers AI transcription is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.',
		)
	}

	// Cloudflare's REST route expects the model as path segments (with `/`), so do
	// not URL-encode the model string (encoding can yield "No route for that URI").
	const url = `${getCloudflareApiBaseUrl()}/accounts/${accountId}/ai/run/${model}`

	// Some TS `fetch` typings only accept `ArrayBufferView` backed by `ArrayBuffer`
	// (not `ArrayBufferLike`). Convert to an `ArrayBuffer`-backed view without
	// copying when possible.
	const mp3Body =
		mp3.buffer instanceof ArrayBuffer
			? new Uint8Array(mp3.buffer, mp3.byteOffset, mp3.byteLength)
			: Uint8Array.from(mp3)

	// For `@cf/openai/whisper`, Cloudflare supports raw binary audio as the body.
	// Docs: https://developers.cloudflare.com/workers-ai/models/whisper/
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			// Best-effort content-type; CF can infer in many cases, but be explicit.
			'Content-Type': 'audio/mpeg',
		},
		body: mp3Body,
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

	return result.text.trim()
}
