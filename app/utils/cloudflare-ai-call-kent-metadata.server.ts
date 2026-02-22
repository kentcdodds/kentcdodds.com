type CallKentEpisodeMetadata = {
	title: string
	description: string
	keywords: string
}

function getCloudflareApiBaseUrl() {
	return 'https://api.cloudflare.com/client/v4'
}

function getCloudflareWorkersAiAuth() {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = process.env.CLOUDFLARE_API_TOKEN

	// In local dev we typically run with `MOCKS=true` and do not require real
	// Cloudflare credentials; MSW only needs a non-empty Authorization header.
	if (process.env.MOCKS === 'true') {
		return {
			accountId: accountId ?? 'mock-account-id',
			// Cloudflare MSW mocks only activate for tokens starting with `MOCK`.
			apiToken: apiToken ?? 'MOCK_cloudflare_api_token',
		}
	}

	return { accountId: accountId ?? null, apiToken: apiToken ?? null }
}

export function isCloudflareCallKentMetadataConfigured() {
	const { accountId, apiToken } = getCloudflareWorkersAiAuth()
	// A model always resolves (hardcoded default in the generator), so only
	// account credentials gate availability.
	return Boolean(accountId && apiToken)
}

function extractJsonObjectFromText(text: string) {
	const start = text.indexOf('{')
	const end = text.lastIndexOf('}')
	if (start < 0 || end < 0 || end <= start) {
		throw new Error('Workers AI did not return JSON')
	}
	const jsonText = text.slice(start, end + 1)
	return JSON.parse(jsonText) as unknown
}

function normalizeKeywords(value: unknown): string {
	if (typeof value === 'string') return value.trim()
	if (Array.isArray(value)) {
		return value
			.filter((v): v is string => typeof v === 'string')
			.map((v) => v.trim())
			.filter(Boolean)
			.join(', ')
	}
	return ''
}

function clampTitle(title: string) {
	const cleaned = title.trim().replace(/\s+/g, ' ')
	// Keep title reasonable for UI + Transistor.
	return cleaned.length > 80 ? `${cleaned.slice(0, 77).trimEnd()}...` : cleaned
}

function unwrapWorkersAiText(result: any): string | null {
	if (!result) return null
	if (typeof result === 'string') return result
	if (typeof result.response === 'string') return result.response
	if (typeof result.output === 'string') return result.output
	if (typeof result.text === 'string') return result.text

	// OpenAI-ish shape (some models / gateways).
	const choiceContent = result?.choices?.[0]?.message?.content
	if (typeof choiceContent === 'string') return choiceContent

	return null
}

export async function generateCallKentEpisodeMetadataWithWorkersAi({
	transcript,
	callTitle,
	callerNotes,
	model = process.env.CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL ??
		process.env.CLOUDFLARE_AI_TEXT_MODEL ??
		'@cf/meta/llama-3.1-8b-instruct',
}: {
	transcript: string
	callTitle?: string | null
	callerNotes?: string | null
	model?: string
}): Promise<CallKentEpisodeMetadata> {
	const { accountId, apiToken } = getCloudflareWorkersAiAuth()
	if (!accountId || !apiToken) {
		throw new Error(
			'Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.',
		)
	}

	const system = [
		'You write metadata for the "Call Kent" podcast.',
		'Given an episode transcript, produce:',
		'- title: <= 80 characters',
		'- description: 2-6 sentences, plain text (no HTML), may include short bullet list',
		'- keywords: 5-12 items, comma-separated',
		'Output ONLY valid JSON with keys: title, description, keywords.',
	].join('\n')

	const user = [
		callTitle ? `Caller-provided title: ${callTitle}` : null,
		callerNotes?.trim() ? `Caller notes: ${callerNotes.trim()}` : null,
		'Transcript:',
		transcript.trim(),
	]
		.filter(Boolean)
		.join('\n\n')

	// Cloudflare's REST route expects the model as path segments (with `/`), so do
	// not URL-encode the model string (encoding can yield "No route for that URI").
	const url = `${getCloudflareApiBaseUrl()}/accounts/${accountId}/ai/run/${model}`

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user },
			],
			max_tokens: 800,
		}),
	})

	if (!res.ok) {
		const bodyText = await res.text().catch(() => '')
		throw new Error(
			`Cloudflare Workers AI metadata generation failed: ${res.status} ${res.statusText}${bodyText ? `\n${bodyText}` : ''}`,
		)
	}

	const json = (await res.json()) as any
	const result = (json?.result ?? json) as any
	const text = unwrapWorkersAiText(result)
	if (!text) {
		throw new Error('Unexpected metadata response shape from Workers AI')
	}

	const obj = extractJsonObjectFromText(text) as any
	const titleRaw = typeof obj?.title === 'string' ? obj.title : ''
	const descriptionRaw = typeof obj?.description === 'string' ? obj.description : ''
	const keywordsRaw = normalizeKeywords(obj?.keywords)

	const title = clampTitle(titleRaw)
	const description = descriptionRaw.trim()
	const keywords = keywordsRaw.trim()

	if (!title) throw new Error('Workers AI metadata JSON missing `title`')
	if (!description)
		throw new Error('Workers AI metadata JSON missing `description`')
	if (!keywords) throw new Error('Workers AI metadata JSON missing `keywords`')

	return { title, description, keywords }
}

export type { CallKentEpisodeMetadata }

