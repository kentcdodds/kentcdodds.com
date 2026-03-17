function parseDocRefFromChunkId(
	chunkId: string,
): { type: string; slug: string } | null {
	const match =
		/^(?<type>[^:]+):(?<slug>[^:]+):chunk:(?<chunkIndex>\d+)$/u.exec(chunkId)
	const type = match?.groups?.type
	const slug = match?.groups?.slug
	if (!type || !slug) return null
	return { type, slug }
}

function normalizeUrlForKey(url: string) {
	const trimmed = url.trim()
	try {
		const parsed = new URL(trimmed, 'https://kentcdodds.com')
		const pathname = parsed.pathname.replace(/\/+$/u, '') || '/'
		return pathname.toLowerCase()
	} catch {
		return trimmed.toLowerCase()
	}
}

function normalizeTitleForKey(title: string) {
	return title.trim().toLowerCase()
}

function normalizeSlugForKey(slug: string) {
	return slug.trim().toLowerCase()
}

function parseYoutubeVideoIdFromUrl(url: string | undefined) {
	if (!url) return null
	try {
		const parsed = new URL(url, 'https://kentcdodds.com')
		if (parsed.pathname !== '/youtube') return null
		const videoId = (parsed.searchParams.get('video') ?? '').trim()
		return /^[A-Za-z0-9_-]{11}$/u.test(videoId) ? videoId : null
	} catch {
		return null
	}
}

export function getLexicalDocId({
	chunkId,
	type,
	slug,
	url,
	title,
}: {
	chunkId: string
	type: string | undefined
	slug: string | undefined
	url: string | undefined
	title: string | undefined
}) {
	if (type === 'youtube') {
		if (slug) return `${type}:${normalizeSlugForKey(slug)}`
		const youtubeVideoId = parseYoutubeVideoIdFromUrl(url)
		if (youtubeVideoId) return `${type}:${normalizeSlugForKey(youtubeVideoId)}`
	}

	if (type && slug) return `${type}:${normalizeSlugForKey(slug)}`

	const parsedRef = parseDocRefFromChunkId(chunkId)
	if (parsedRef) {
		return `${parsedRef.type}:${normalizeSlugForKey(parsedRef.slug)}`
	}

	const normalizedUrl = url ? normalizeUrlForKey(url) : undefined
	if (type && normalizedUrl) return `${type}:${normalizedUrl}`
	if (normalizedUrl) return normalizedUrl
	if (type && title) return `${type}:${normalizeTitleForKey(title)}`
	return chunkId
}
