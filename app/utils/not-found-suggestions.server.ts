import { sortNotFoundMatches, type NotFoundMatch } from './not-found-matches.ts'
import { notFoundQueryFromPathname } from './not-found-query.ts'
import { semanticSearchKCD } from './semantic-search.server.ts'

function requestWantsHtml(request: Request) {
	// Avoid expensive semantic search for asset/API requests.
	const accept = request.headers.get('accept') ?? ''
	return (
		accept.includes('text/html') ||
		accept.includes('application/xhtml+xml')
	)
}

function normalizePathname(pathname: string) {
	const cleaned = (pathname.split(/[?#]/)[0] ?? '').trim()
	if (!cleaned) return '/'
	if (cleaned === '/') return '/'
	return cleaned.replace(/\/+$/, '') || '/'
}

function toUrlKey(url: string) {
	// Normalize relative and absolute URLs for dedupe.
	try {
		const u = new URL(url, 'https://kentcdodds.com')
		return `${u.pathname}${u.search}`
	} catch {
		return url
	}
}

function normalizeNotFoundUrl(rawUrl: string) {
	const url = rawUrl.trim()
	if (!url) return ''
	if (url.startsWith('/')) return url
	if (/^https?:\/\//i.test(url)) {
		try {
			const u = new URL(url)
			return `${u.pathname}${u.search}${u.hash}`
		} catch {
			return ''
		}
	}
	return ''
}

export async function getNotFoundSuggestions({
	request,
	pathname,
	limit = 8,
	topK = 15,
	priorities,
}: {
	request: Request
	pathname?: string
	limit?: number
	topK?: number
	priorities?: ReadonlyArray<string>
}): Promise<{ query: string; matches: Array<NotFoundMatch> } | null> {
	// Unit tests don't load MSW handlers; avoid real network calls.
	if (process.env.NODE_ENV === 'test') return null
	if (request.method.toUpperCase() !== 'GET') return null
	if (!requestWantsHtml(request)) return null

	const resolvedPathname = normalizePathname(
		typeof pathname === 'string' && pathname ? pathname : new URL(request.url).pathname,
	)
	const query = notFoundQueryFromPathname(resolvedPathname)
	if (!query || query.length < 3) return null

	try {
		const results = await semanticSearchKCD({ query, topK })
		const byUrl = new Map<string, NotFoundMatch>()

		for (const r of results) {
			const rawUrl =
				typeof r.url === 'string' && r.url.trim()
					? r.url.trim()
					: typeof r.id === 'string' && r.id.startsWith('/')
						? r.id
						: ''
			const url = rawUrl ? normalizeNotFoundUrl(rawUrl) : ''
			if (!url) continue

			// Skip suggesting the missing URL itself.
			if (normalizePathname(url) === resolvedPathname) continue

			const key = toUrlKey(url)
			if (byUrl.has(key)) continue

			byUrl.set(key, {
				url,
				type: typeof r.type === 'string' && r.type.trim() ? r.type.trim() : 'result',
				title:
					typeof r.title === 'string' && r.title.trim()
						? r.title.trim()
						: url,
				summary:
					typeof r.summary === 'string' && r.summary.trim()
						? r.summary.trim()
						: typeof r.snippet === 'string' && r.snippet.trim()
							? r.snippet.trim()
							: undefined,
				imageUrl:
					typeof r.imageUrl === 'string' && r.imageUrl.trim()
						? r.imageUrl.trim()
						: undefined,
				imageAlt:
					typeof r.imageAlt === 'string' && r.imageAlt.trim()
						? r.imageAlt.trim()
						: undefined,
			})
		}

		const matches = sortNotFoundMatches([...byUrl.values()], { priorities }).slice(
			0,
			Math.max(0, Math.floor(limit)),
		)

		return { query, matches }
	} catch (error: unknown) {
		// 404 pages should never fail the request because semantic search failed.
		console.error('Semantic search failed while rendering 404 suggestions', error)
		return null
	}
}

