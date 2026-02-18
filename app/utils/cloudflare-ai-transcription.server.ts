type WhisperTranscriptionResponse = {
	text: string
	// Other fields exist (words/vtt/etc) but we only need `text` for Transistor.
}

function getRequiredEnv(name: string) {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

function getCloudflareApiBaseUrl() {
	return 'https://api.cloudflare.com/client/v4'
}

export function isCloudflareTranscriptionConfigured() {
	return Boolean(
		process.env.CLOUDFLARE_ACCOUNT_ID &&
			process.env.CLOUDFLARE_API_TOKEN &&
			process.env.CLOUDFLARE_AI_TRANSCRIPTION_MODEL,
	)
}

export async function transcribeMp3WithWorkersAi({
	mp3,
	model = getRequiredEnv('CLOUDFLARE_AI_TRANSCRIPTION_MODEL'),
}: {
	mp3: Uint8Array
	/**
	 * Recommended: `@cf/openai/whisper` because it supports raw binary audio via
	 * the REST API. `@cf/openai/whisper-large-v3-turbo` typically expects base64,
	 * which is more memory-heavy.
	 */
	model?: string
}): Promise<string> {
	const accountId = getRequiredEnv('CLOUDFLARE_ACCOUNT_ID')
	const apiToken = getRequiredEnv('CLOUDFLARE_API_TOKEN')

	const url = `${getCloudflareApiBaseUrl()}/accounts/${accountId}/ai/run/${encodeURIComponent(
		model,
	)}`

	// For `@cf/openai/whisper`, Cloudflare supports raw binary audio as the body.
	// Docs: https://developers.cloudflare.com/workers-ai/models/whisper/
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			// Best-effort content-type; CF can infer in many cases, but be explicit.
			'Content-Type': 'audio/mpeg',
		},
		body: mp3,
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

