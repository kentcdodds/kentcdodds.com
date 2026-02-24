import { getEnv } from './env.server.ts'

type CallKentEpisodeMetadata = {
	title: string
	description: string
	keywords: string
}

function getWorkersAiRunUrl({ model }: { model: string }) {
	// Cloudflare's REST route expects the model as path segments (with `/`), so do
	// not URL-encode the model string (encoding can yield "No route for that URI").
	const env = getEnv()
	return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_GATEWAY_ID}/workers-ai/${model}`
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
	callerTranscript,
	responderTranscript,
	callTitle,
	callerNotes,
	model,
}: {
	/**
	 * Optional; prefer using `callerTranscript` + `responderTranscript` when
	 * available (e.g. when we transcribe segments separately).
	 */
	transcript?: string
	callerTranscript?: string | null
	responderTranscript?: string | null
	callTitle?: string | null
	callerNotes?: string | null
	model?: string
}): Promise<CallKentEpisodeMetadata> {
	const env = getEnv()
	const apiToken = env.CLOUDFLARE_API_TOKEN
	const modelToUse = model ?? env.CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL

	// Keep the model anchored on canonical details to reduce hallucinated links/names.
	const canonicalSiteUrl = 'https://kentcdodds.com'
	const canonicalCallsUrl = `${canonicalSiteUrl}/calls`

	const system = `
You write metadata for the "Call Kent Podcast", hosted by Kent C. Dodds.
Only use information that is explicitly present in the provided transcripts and/or caller notes.
Do NOT invent details (names, companies, sponsors, products, locations, links).
If you are unsure about a detail, omit it rather than guessing.
Canonical references (use these exactly; do not make up lookalike domains):
- Kent C. Dodds website: ${canonicalSiteUrl}
- Leave a call / listen to episodes: ${canonicalCallsUrl}
If you include a URL/domain in the description, it must be copied verbatim from the transcript/caller notes OR be one of the canonical references above.
You will usually receive two transcript sections:
- Caller transcript (question / context)
- Responder transcript (Kent's answer)
Use both sections to craft accurate, specific metadata.
Given the transcripts, produce:
- title: <= 80 characters
- description: 2-6 sentences, markdown is allowed; focus on what was asked + what Kent answered; avoid generic filler
- description may optionally end with a single call-to-action sentence using the canonical references above
- keywords: 1-5 items, comma-separated
Output ONLY valid JSON with keys: title, description, keywords.
`.trim()

	const hasSegmentTranscripts = Boolean(
		callerTranscript?.trim() && responderTranscript?.trim(),
	)
	const transcriptBlock = hasSegmentTranscripts
		? `
# Transcripts:

## Caller transcript:

${callerTranscript!.trim()}

## Responder transcript (Kent's answer):

${responderTranscript!.trim()}
`.trim()
		: transcript?.trim()
			? `
# Transcript:

${transcript.trim()}
`.trim()
			: ''

	if (!transcriptBlock) {
		throw new Error(
			'Missing transcript input: provide `callerTranscript` + `responderTranscript` or `transcript`.',
		)
	}

	const user = `
${callTitle ? `Caller-provided title: ${callTitle}\n\n` : ''}${callerNotes?.trim() ? `Caller notes: ${callerNotes.trim()}\n\n` : ''}${transcriptBlock}
`.trim()

	const url = getWorkersAiRunUrl({ model: modelToUse })

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'cf-aig-authorization': `Bearer ${env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN}`,
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
	const descriptionRaw =
		typeof obj?.description === 'string' ? obj.description : ''
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
