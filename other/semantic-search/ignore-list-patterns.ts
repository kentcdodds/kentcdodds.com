export type SemanticSearchIgnoreList = {
	version: 1
	updatedAt?: string
	/**
	 * Patterns are matched against doc IDs (ex: `youtube:dQw4w9WgXcQ`).
	 * Supports:
	 * - exact match: `blog:my-post`
	 * - prefix match: `youtube:*` (wildcard is supported only at the end)
	 *
	 * Note: a bare `*` matches every doc ID (empty prefix).
	 */
	patterns: string[]
}

export const DEFAULT_IGNORE_LIST_KEY = 'manifests/ignore-list.json'

function normalizePattern(pattern: string) {
	return pattern.trim()
}

export function matchesIgnorePattern(docId: string, pattern: string) {
	const normalized = normalizePattern(pattern)
	if (!normalized) return false
	if (normalized.endsWith('*')) {
		const prefix = normalized.slice(0, -1)
		return docId.startsWith(prefix)
	}
	return docId === normalized
}

export function isDocIdIgnored({
	docId,
	ignoreList,
}: {
	docId: string
	ignoreList: SemanticSearchIgnoreList
}) {
	return (ignoreList.patterns ?? []).some((p) => matchesIgnorePattern(docId, p))
}

export function getIgnoreListKey() {
	return (process.env.SEMANTIC_SEARCH_IGNORE_LIST_KEY ?? DEFAULT_IGNORE_LIST_KEY)
		.trim()
}
