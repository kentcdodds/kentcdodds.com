import { getEnv } from './env.server.ts'

function getWorkersAiRunUrl(model: string) {
	// Cloudflare's REST route expects the model as path segments (with `/`), so do
	// not URL-encode the model string (encoding can yield "No route for that URI").
	const env = getEnv()
	return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_GATEWAY_ID}/workers-ai/${model}`
}

type WorkersAiTextToSpeechResponse = {
	// Some models return base64 audio within JSON.
	audio?: string
	// Cloudflare REST API often wraps results in { result: ... }.
	result?: unknown
}

function looksLikeBase64(value: string) {
	// Best-effort heuristic: base64 tends to be long and composed of A-Z/a-z/0-9/+/
	// with optional padding.
	return /^[A-Za-z0-9+/]+=*$/u.test(value) && value.length >= 64
}

export async function synthesizeSpeechWithWorkersAi({
	text,
	voice,
	model = getEnv().CLOUDFLARE_AI_TEXT_TO_SPEECH_MODEL,
}: {
	text: string
	voice?: string
	model?: string
}): Promise<{ bytes: Uint8Array; contentType: string; model: string }> {
	const env = getEnv()
	const apiToken = env.CLOUDFLARE_API_TOKEN
	const url = getWorkersAiRunUrl(model)

	const lowerModel = model.toLowerCase()
	const payload =
		lowerModel.includes('deepgram/aura') || lowerModel.includes('aura-')
			? {
					text,
					// aura-2-en defaults to "luna", but allow callers to override.
					...(voice ? { speaker: voice } : {}),
					encoding: 'mp3',
				}
			: lowerModel.includes('melotts')
				? { prompt: text, lang: 'en' }
				: {
						// Fall back to the Aura-shaped payload; many TTS models use `text`.
						text,
						...(voice ? { speaker: voice } : {}),
					}

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'cf-aig-authorization': `Bearer ${env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN}`,
			'Content-Type': 'application/json',
			// Many TTS models return binary audio when requested.
			Accept: 'audio/mpeg,application/json;q=0.9,*/*;q=0.8',
		},
		body: JSON.stringify(payload),
	})

	if (!res.ok) {
		const bodyText = await res.text().catch(() => '')
		throw new Error(
			`Cloudflare Workers AI text-to-speech failed: ${res.status} ${res.statusText}${bodyText ? `\n${bodyText}` : ''}`,
		)
	}

	const contentTypeHeader = res.headers.get('content-type') ?? ''
	const contentTypeLower = contentTypeHeader.toLowerCase()
	const isJson =
		contentTypeLower.includes('application/json') ||
		contentTypeLower.includes('application/problem+json')
	const isAudio = contentTypeLower.startsWith('audio/')

	if (isAudio || !isJson) {
		const bytes = new Uint8Array(await res.arrayBuffer())
		const contentType = isAudio ? contentTypeHeader : 'audio/mpeg'
		return { bytes, contentType, model }
	}

	const json = (await res.json()) as any
	const unwrapped: WorkersAiTextToSpeechResponse = (json?.result ?? json) as any

	const audioValue =
		typeof unwrapped?.audio === 'string'
			? unwrapped.audio
			: typeof unwrapped?.result === 'string'
				? (unwrapped.result as string)
				: null

	if (!audioValue || typeof audioValue !== 'string') {
		throw new Error(
			`Unexpected text-to-speech response shape from Workers AI (model: ${model})`,
		)
	}
	if (!looksLikeBase64(audioValue)) {
		throw new Error(
			`Workers AI text-to-speech returned non-audio JSON (model: ${model})`,
		)
	}

	const bytes = new Uint8Array(Buffer.from(audioValue, 'base64'))
	return { bytes, contentType: 'audio/mpeg', model }
}
