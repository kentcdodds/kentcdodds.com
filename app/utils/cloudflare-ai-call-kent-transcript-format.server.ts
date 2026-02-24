import {
	getWorkersAiRunUrl,
	unwrapWorkersAiText,
} from './cloudflare-ai-utils.server.ts'
import { getEnv } from './env.server.ts'

function clampNumber(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

function normalizeForComparison(text: string) {
	return text.trim().replace(/\s+/g, ' ')
}

function countWords(text: string) {
	const normalized = normalizeForComparison(text)
	if (!normalized) return 0
	return normalized.split(' ').length
}

function estimateMaxTokensForTranscriptFormatting(transcript: string) {
	const normalized = normalizeForComparison(transcript)
	// Rough heuristic: ~4 characters per token for English-ish text.
	const approxTokens = Math.ceil(normalized.length / 4)
	// Output is usually similar length to input, with a bit of overhead.
	return clampNumber(Math.ceil(approxTokens * 1.2) + 128, 512, 8192)
}

function stripSingleMarkdownCodeFence(text: string) {
	const trimmed = text.trim()
	const match = /^```(?:text|markdown)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed)
	return match?.[1] ? match[1].trim() : text
}

function extractBetweenMarkers({
	text,
	startMarker,
	endMarker,
}: {
	text: string
	startMarker: string
	endMarker: string
}) {
	const start = text.indexOf(startMarker)
	if (start === -1) return null
	const end = text.indexOf(endMarker, start + startMarker.length)
	if (end === -1) return null
	return text.slice(start + startMarker.length, end).trim()
}

function countSeparatorLines(text: string) {
	return (text.match(/^---$/gm) ?? []).length
}

export async function formatCallKentTranscriptWithWorkersAi({
	transcript,
	callTitle,
	callerNotes,
	callerName,
	model,
	maxTokens,
}: {
	transcript: string
	callTitle?: string | null
	callerNotes?: string | null
	callerName?: string
	model?: string
	/**
	 * Optional override for Workers AI `max_tokens` output budget.
	 * Defaults to a heuristic based on the input transcript length.
	 */
	maxTokens?: number
}): Promise<string> {
	const env = getEnv()
	const apiToken = env.CLOUDFLARE_API_TOKEN
	const modelToUse =
		model ?? env.CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL

	const input = transcript.trim()
	if (!input) {
		throw new Error('Missing transcript input for transcript formatting.')
	}

	const startMarker = '<<<TRANSCRIPT>>>'
	const endMarker = '<<<END TRANSCRIPT>>>'
	const maxTokensToUse =
		typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0
			? clampNumber(Math.floor(maxTokens), 256, 8192)
			: estimateMaxTokensForTranscriptFormatting(input)

	const system = `
You format transcripts for the "Call Kent Podcast", hosted by Kent C. Dodds.

Your job is to improve readability by inserting paragraph breaks (blank lines) and normalizing whitespace.
Do NOT add, remove, or reorder any words. Do NOT change speaker labels.

If the transcript includes separator lines containing only "---", keep those lines exactly as-is and on their own line.

Output only the final formatted transcript as plain text.
Do not include commentary, headings, JSON, or Markdown code fences.
`.trim()

	const contextLines = [
		callTitle?.trim() ? `Episode title: ${callTitle.trim()}` : null,
		callerNotes?.trim() ? `Caller notes: ${callerNotes.trim()}` : null,
		callerName?.trim() ? `Caller first name: ${callerName.trim()}` : null,
	].filter(Boolean)

	const user = `
${contextLines.length ? `${contextLines.join('\n')}\n\n` : ''}Format this transcript into readable paragraphs.

${startMarker}
${input}
${endMarker}
`.trim()

	const url = getWorkersAiRunUrl(modelToUse)
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
			max_tokens: maxTokensToUse,
		}),
	})

	if (!res.ok) {
		const bodyText = await res.text().catch(() => '')
		throw new Error(
			`Cloudflare Workers AI transcript formatting failed: ${res.status} ${res.statusText}${bodyText ? `\n${bodyText}` : ''}`,
		)
	}

	const json = (await res.json()) as any
	const result = (json?.result ?? json) as any
	const text = unwrapWorkersAiText(result)
	if (!text) {
		throw new Error(
			'Unexpected transcript formatting response shape from Workers AI',
		)
	}

	let formatted = stripSingleMarkdownCodeFence(text).trim()
	const extracted = extractBetweenMarkers({
		text: formatted,
		startMarker,
		endMarker,
	})
	if (extracted) formatted = extracted

	// Safety checks: we never want to persist "metadata JSON" as the transcript.
	if (
		formatted.startsWith('{') &&
		/"title"\s*:/.test(formatted) &&
		/"description"\s*:/.test(formatted) &&
		/"keywords"\s*:/.test(formatted)
	) {
		throw new Error('Transcript formatter returned metadata JSON unexpectedly.')
	}

	if (!formatted) {
		throw new Error('Transcript formatter returned an empty transcript.')
	}

	const originalSepCount = countSeparatorLines(input)
	if (originalSepCount > 0) {
		const formattedSepCount = countSeparatorLines(formatted)
		if (formattedSepCount !== originalSepCount) {
			throw new Error(
				`Transcript formatter changed separator count (${originalSepCount} -> ${formattedSepCount}).`,
			)
		}
	}

	// Catch likely truncation/omissions (e.g. too-low max_tokens or model limits).
	// Prefer throwing so callers can fall back to the raw transcript.
	const inputNormalized = normalizeForComparison(input)
	const formattedNormalized = normalizeForComparison(formatted)
	const minLengthForTruncationCheck = 1000
	if (inputNormalized.length >= minLengthForTruncationCheck) {
		const lengthRatio = formattedNormalized.length / inputNormalized.length
		const inputWords = countWords(inputNormalized)
		const formattedWords = countWords(formattedNormalized)
		const wordRatio = inputWords ? formattedWords / inputWords : 1
		if (lengthRatio < 0.95 || wordRatio < 0.95) {
			throw new Error(
				`Transcript formatter output appears truncated (max_tokens=${maxTokensToUse}, lengthRatio=${lengthRatio.toFixed(
					2,
				)}, wordRatio=${wordRatio.toFixed(2)}).`,
			)
		}
	}

	return formatted
}
