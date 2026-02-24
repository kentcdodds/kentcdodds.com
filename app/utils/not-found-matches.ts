export type NotFoundMatch = {
	url: string
	type: string
	title: string
	summary?: string
	imageUrl?: string
	imageAlt?: string
}

function isSafeInternalPath(path: string) {
	// Reject protocol-relative URLs (`//evil.com/...`) which browsers treat as absolute.
	return path.startsWith('/') && !path.startsWith('//')
}

export function normalizeNotFoundUrl(rawUrl: string) {
	const url = rawUrl.trim()
	if (!url) return ''
	// Only allow internal app paths. This also keeps client/server rendering consistent
	// when `/resources/search` returns absolute URLs.
	if (isSafeInternalPath(url)) return url
	if (/^https?:\/\//i.test(url)) {
		try {
			const u = new URL(url)
			const path = `${u.pathname}${u.search}${u.hash}`
			return isSafeInternalPath(path) ? path : ''
		} catch {
			return ''
		}
	}
	return ''
}

function normalizeType(type: string) {
	// Keep UI labels simple and consistent.
	if (type === 'jsx-page') return 'page'
	return type
}

function getTypePriority(type: string, priorities: ReadonlyArray<string>) {
	const normalized = normalizeType(type)
	const idx = priorities.indexOf(normalized)
	return idx === -1 ? Number.POSITIVE_INFINITY : idx
}

/**
 * Stable sort that keeps semantic ranking within each type group.
 */
export function sortNotFoundMatches(
	matches: ReadonlyArray<NotFoundMatch>,
	{
		priorities = ['blog', 'page'],
	}: {
		priorities?: ReadonlyArray<string>
	} = {},
): Array<NotFoundMatch> {
	return matches
		.map((m, index) => ({
			m: { ...m, type: normalizeType(m.type) },
			index,
			priority: getTypePriority(m.type, priorities),
		}))
		.sort((a, b) => {
			if (a.priority !== b.priority) return a.priority - b.priority
			return a.index - b.index
		})
		.map((x) => x.m)
}

