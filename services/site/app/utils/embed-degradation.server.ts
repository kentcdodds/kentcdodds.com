/**
 * Tracks embed degradations during MDX compilation: a tweet that could not be
 * fetched (baked as a callout), a remark-embedder error (baked as an error
 * paragraph), a mermaid render failure (kept as a plain code block), or a
 * fallback plain link. The compile CLI skips persistent document-cache writes
 * for documents that degraded, so transient provider failures heal on the
 * next compile instead of being served from cache for months.
 */
let embedDegradationCount = 0

export function recordEmbedDegradation(url: string, reason: string) {
	embedDegradationCount++
	console.warn(`[mdx:embed-degraded] ${url} (${reason})`)
}

export function getEmbedDegradationCount() {
	return embedDegradationCount
}
