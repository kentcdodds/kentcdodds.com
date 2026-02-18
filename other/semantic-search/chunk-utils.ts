import crypto from 'node:crypto'

function isHighSurrogate(code: number) {
	return code >= 0xd800 && code <= 0xdbff
}

function isLowSurrogate(code: number) {
	return code >= 0xdc00 && code <= 0xdfff
}

function safeSlice(input: string, start: number, end: number) {
	let s = Math.max(0, start)
	let e = Math.min(input.length, end)
	if (s >= e) return ''

	// Avoid starting on the 2nd half of a surrogate pair.
	if (s > 0) {
		const code = input.charCodeAt(s)
		const prev = input.charCodeAt(s - 1)
		if (isLowSurrogate(code) && isHighSurrogate(prev)) {
			s -= 1
		}
	}

	// Avoid ending right after the 1st half of a surrogate pair.
	if (e < input.length) {
		const prev = input.charCodeAt(e - 1)
		const next = input.charCodeAt(e)
		if (isHighSurrogate(prev) && isLowSurrogate(next)) {
			e += 1
		}
	}

	return input.slice(s, e)
}

export function normalizeText(input: string) {
	return (
		input
			.replace(/\r\n/g, '\n')
			.replace(/\t/g, ' ')
			// collapse trailing spaces
			.replace(/[ \t]+\n/g, '\n')
			// collapse leading spaces
			.replace(/\n[ \t]+/g, '\n')
			// collapse runs of spaces
			.replace(/[ ]{2,}/g, ' ')
			// collapse runs of blank lines
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	)
}

export function sha256(input: string) {
	return crypto.createHash('sha256').update(input).digest('hex')
}

export function makeSnippet(input: string, maxLen = 220) {
	const text = normalizeText(input)
	if (text.length <= maxLen) return text
	return `${safeSlice(text, 0, Math.max(0, maxLen - 1))}…`
}

export function chunkText(
	input: string,
	{
		targetChars = 4500,
		overlapChars = 600,
		maxChunkChars = 6500,
	}: {
		targetChars?: number
		overlapChars?: number
		maxChunkChars?: number
	} = {},
) {
	const text = normalizeText(input)
	if (!text) return []
	if (text.length <= maxChunkChars) return [text]

	const paragraphs = text.split(/\n\s*\n/g).filter(Boolean)
	const chunks: string[] = []
	let current = ''

	for (const p of paragraphs) {
		const next = current ? `${current}\n\n${p}` : p
		if (next.length <= targetChars) {
			current = next
			continue
		}

		if (current) {
			chunks.push(current)
			const overlap = safeSlice(
				current,
				Math.max(0, current.length - overlapChars),
				current.length,
			)
			current = overlap ? `${overlap}\n\n${p}` : p
		} else {
			// Single paragraph too large; hard-split deterministically.
			for (let i = 0; i < p.length; i += targetChars) {
				chunks.push(safeSlice(p, i, i + targetChars))
			}
			current = ''
		}
	}

	if (current) chunks.push(current)

	// Final safety clamp
	return chunks.flatMap((c) => {
		if (c.length <= maxChunkChars) return [c]
		const parts: string[] = []
		for (let i = 0; i < c.length; i += targetChars) {
			parts.push(safeSlice(c, i, i + targetChars))
		}
		return parts
	})
}

/**
 * Like `chunkText`, but preserves the input content as-is (useful for indexing
 * raw MDX without collapsing whitespace/formatting).
 */
export function chunkTextRaw(
	input: string,
	{
		targetChars = 4500,
		overlapChars = 600,
		maxChunkChars = 6500,
	}: {
		targetChars?: number
		overlapChars?: number
		maxChunkChars?: number
	} = {},
) {
	const text = input.replace(/\r\n/g, '\n')
	if (!text.trim()) return []
	if (text.length <= maxChunkChars) return [text]

	const paragraphs = text.split(/\n\s*\n/g).filter(Boolean)
	const chunks: string[] = []
	let current = ''

	for (const p of paragraphs) {
		const next = current ? `${current}\n\n${p}` : p
		if (next.length <= targetChars) {
			current = next
			continue
		}

		if (current) {
			chunks.push(current)
			const overlap = safeSlice(
				current,
				Math.max(0, current.length - overlapChars),
				current.length,
			)
			current = overlap ? `${overlap}\n\n${p}` : p
		} else {
			for (let i = 0; i < p.length; i += targetChars) {
				chunks.push(safeSlice(p, i, i + targetChars))
			}
			current = ''
		}
	}

	if (current) chunks.push(current)

	return chunks.flatMap((c) => {
		if (c.length <= maxChunkChars) return [c]
		const parts: string[] = []
		for (let i = 0; i < c.length; i += targetChars) {
			parts.push(safeSlice(c, i, i + targetChars))
		}
		return parts
	})
}

