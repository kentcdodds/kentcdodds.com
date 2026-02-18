import crypto from 'node:crypto'

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
	return `${text.slice(0, Math.max(0, maxLen - 1))}…`
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
			const overlap = current.slice(Math.max(0, current.length - overlapChars))
			current = overlap ? `${overlap}\n\n${p}` : p
		} else {
			// Single paragraph too large; hard-split deterministically.
			for (let i = 0; i < p.length; i += targetChars) {
				chunks.push(p.slice(i, i + targetChars))
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
			parts.push(c.slice(i, i + targetChars))
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
			const overlap = current.slice(Math.max(0, current.length - overlapChars))
			current = overlap ? `${overlap}\n\n${p}` : p
		} else {
			for (let i = 0; i < p.length; i += targetChars) {
				chunks.push(p.slice(i, i + targetChars))
			}
			current = ''
		}
	}

	if (current) chunks.push(current)

	return chunks.flatMap((c) => {
		if (c.length <= maxChunkChars) return [c]
		const parts: string[] = []
		for (let i = 0; i < c.length; i += targetChars) {
			parts.push(c.slice(i, i + targetChars))
		}
		return parts
	})
}

