import { getEnv } from './env.server.ts'

function getWorkersAiRunUrl(model: string) {
	// Cloudflare's REST route expects the model as path segments (with `/`), so do
	// not URL-encode the model string (encoding can yield "No route for that URI").
	const env = getEnv()
	return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_GATEWAY_ID}/workers-ai/${model}`
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
}: {
	transcript: string
	callTitle?: string | null
	callerNotes?: string | null
	callerName?: string
	model?: string
}): Promise<string> {
	const env = getEnv()
	const apiToken = env.CLOUDFLARE_API_TOKEN
	const modelToUse = model ?? env.CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL

	const input = transcript.trim()
	if (!input) {
		throw new Error('Missing transcript input for transcript formatting.')
	}

	const startMarker = '<<<TRANSCRIPT>>>'
	const endMarker = '<<<END TRANSCRIPT>>>'

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
			// Needs to be large enough to return the full transcript, but still keep
			// Workers AI outputs bounded.
			max_tokens: 4096,
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
		throw new Error('Unexpected transcript formatting response shape from Workers AI')
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

	return formatted
}

