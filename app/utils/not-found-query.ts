function safeDecodeURIComponent(value: string) {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

/**
 * Convert a missing pathname into a semantic-search-friendly query string.
 *
 * Example: `/blog/react-testing-library` -> `blog react testing library`
 */
export function notFoundQueryFromPathname(pathname: string) {
	const cleaned = (pathname ?? '').split(/[?#]/)[0] ?? ''
	const segments = cleaned.split('/').filter(Boolean)
	if (segments.length === 0) return ''

	const words = segments
		.map((segment) => {
			let text = safeDecodeURIComponent(segment)
			text = text.replace(/[-_.]+/g, ' ')
			// Split simple camelCase boundaries.
			text = text.replace(/([a-z])([A-Z])/g, '$1 $2')
			return text
		})
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim()

	// Keep queries reasonably small; embeddings don't benefit from very long URL-ish strings.
	return words.length > 120 ? words.slice(0, 120).trim() : words
}

