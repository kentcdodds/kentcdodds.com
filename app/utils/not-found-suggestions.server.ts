import {
	normalizeNotFoundUrl,
	sortNotFoundMatches,
	type NotFoundMatch,
} from './not-found-matches.ts'
import { notFoundQueryFromPathname } from './not-found-query.ts'
import { semanticSearchKCD } from './semantic-search.server.ts'

class LocalTimeoutError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'LocalTimeoutError'
	}
}

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
		// 404s should stay fast even if semantic search is slow/unavailable.
		const timeoutMs = 1500
		let timeoutId: ReturnType<typeof setTimeout> | null = null
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() => reject(new LocalTimeoutError('Timeout')),
				timeoutMs,
			)
		})
		const results = await Promise.race([
			semanticSearchKCD({ query, topK, request }),
			timeoutPromise,
		]).finally(() => {
			if (timeoutId) clearTimeout(timeoutId)
		})

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
		if (error instanceof LocalTimeoutError) return null
		// 404 pages should never fail the request because semantic search failed.
		console.error('Semantic search failed while rendering 404 suggestions', error)
		return null
	}
}

