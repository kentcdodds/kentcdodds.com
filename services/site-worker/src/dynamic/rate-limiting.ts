/**
 * In-memory sliding-window rate limiting for the dynamic app worker.
 * Limits and tier paths mirror `services/site/server/rate-limiting.ts`.
 * State is per-isolate (not shared across Workers).
 */

type RateLimitTier =
	| 'strongest'
	| 'strong'
	| 'search'
	| 'content-index'
	| 'markdown'
	| 'general'

type RateLimitWindow = {
	count: number
	resetAt: number
}

export type RateLimitResult = {
	allowed: boolean
	limit: number
	remaining: number
	reset: number
	tier: RateLimitTier
}

const WINDOW_MS = 60 * 1000
const windows = new Map<string, RateLimitWindow>()

export function clearRateLimitWindowsForTests() {
	windows.clear()
}

const strongestNonGetPaths = [
	'/login',
	'/signup',
	'/forgot-password',
	'/reset-password',
	'/me/password',
	'/oauth/authorize',
	'/admin',
	'/resources/calls/save',
	'/resources/calls/text-to-speech',
	'/resources/webauthn',
	'/action/mark-as-read',
]

const strongestGetPaths = [
	'/magic',
	'/discord/callback',
	'/signup',
	'/reset-password',
]

const searchGetPaths = ['/search', '/resources/search']

const contentIndexGetPaths = [
	'/sitemap.xml',
	'/blog/rss.xml',
	'/blog.json',
	'/.well-known/api-catalog',
	'/.well-known/api-docs',
	'/openapi.json',
]

function getSearchHintQuery(pathname: string) {
	return pathname
		.replace(/^\/+/, '')
		.replace(/[-_./]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function getAgentSearchPath(pathname: string) {
	const query = getSearchHintQuery(pathname)
	if (!query) return '/resources/search?query='
	return `/resources/search?query=${encodeURIComponent(query)}`
}

export function getAgentSearchHintHeaders(pathname: string) {
	const searchPath = getAgentSearchPath(pathname)
	return {
		Link: `<${searchPath}>; rel="search"; type="application/json"`,
		'X-Agent-Search-Hint': `Agents should use ${searchPath} for semantic search instead of bulk markdown scraping.`,
	}
}

export function getAgentSearchHintMarkdown(pathname: string) {
	const searchPath = getAgentSearchPath(pathname)
	return [
		'# Markdown Rate Limit',
		'',
		'This markdown representation is rate limited to keep kentcdodds.com healthy.',
		'',
		'If you are an agent exploring the site, use the semantic search endpoint instead:',
		'',
		`\`${searchPath}\``,
		'',
		'Use specific natural-language queries, then fetch only the pages you need.',
	].join('\n')
}

function requestPrefersMarkdown(acceptHeader: string | null) {
	if (!acceptHeader) return false
	const entries = acceptHeader
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
	let htmlQ = -1
	let markdownQ = -1
	for (const entry of entries) {
		const segments = entry.split(';').map((segment) => segment.trim())
		const type = segments[0]
		if (!type) continue
		const qParam = segments.find((segment) => segment.startsWith('q='))
		const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1
		if (type === 'text/html') htmlQ = q
		if (type === 'text/markdown') markdownQ = q
	}
	if (markdownQ < 0) return false
	if (htmlQ < 0) return true
	return markdownQ >= htmlQ
}

function getTier({
	method,
	pathname,
	acceptHeader,
}: {
	method: string
	pathname: string
	acceptHeader: string | null
}): RateLimitTier {
	if (method !== 'GET' && method !== 'HEAD') {
		if (strongestNonGetPaths.some((p) => pathname.includes(p))) {
			return 'strongest'
		}
		return 'strong'
	}

	if (strongestGetPaths.some((p) => pathname.includes(p))) {
		return 'strongest'
	}

	if (requestPrefersMarkdown(acceptHeader)) {
		return 'markdown'
	}

	if (searchGetPaths.some((p) => pathname === p)) {
		return 'search'
	}

	if (contentIndexGetPaths.some((p) => pathname === p)) {
		return 'content-index'
	}

	return 'general'
}

function getLimitForTier(tier: RateLimitTier, mocks: boolean) {
	const maxMultiple = mocks ? 10_000 : 1
	switch (tier) {
		case 'strongest':
			return 10 * maxMultiple
		case 'strong':
			return 100 * maxMultiple
		case 'search':
			return 60 * maxMultiple
		case 'content-index':
			return 30 * maxMultiple
		case 'markdown':
			return 20 * maxMultiple
		case 'general':
			return 300 * maxMultiple
		default: {
			const _exhaustive: never = tier
			return _exhaustive
		}
	}
}

function getClientIp(request: Request) {
	return (
		request.headers.get('CF-Connecting-IP') ??
		request.headers.get('Fly-Client-Ip') ??
		'0.0.0.0'
	)
}

export function checkRateLimit(
	request: Request,
	{ mocks = false }: { mocks?: boolean } = {},
): RateLimitResult {
	const url = new URL(request.url)
	const tier = getTier({
		method: request.method,
		pathname: url.pathname,
		acceptHeader: request.headers.get('Accept'),
	})
	const limit = getLimitForTier(tier, mocks)
	const key = `${getClientIp(request)}:${tier}`
	const now = Date.now()
	let window = windows.get(key)
	if (!window || now >= window.resetAt) {
		window = { count: 0, resetAt: now + WINDOW_MS }
		windows.set(key, window)
	}
	window.count += 1
	const remaining = Math.max(0, limit - window.count)
	return {
		allowed: window.count <= limit,
		limit,
		remaining,
		reset: Math.ceil(window.resetAt / 1000),
		tier,
	}
}

export function applyRateLimitHeaders(
	headers: Headers,
	result: RateLimitResult,
) {
	headers.set('RateLimit-Limit', String(result.limit))
	headers.set('RateLimit-Remaining', String(result.remaining))
	headers.set('RateLimit-Reset', String(result.reset))
}

export function createRateLimitedResponse(
	request: Request,
	result: RateLimitResult,
): Response {
	const url = new URL(request.url)
	if (result.tier === 'markdown') {
		const hintHeaders = getAgentSearchHintHeaders(url.pathname)
		return new Response(getAgentSearchHintMarkdown(url.pathname), {
			status: 429,
			headers: {
				'content-type': 'text/markdown; charset=utf-8',
				...hintHeaders,
				'RateLimit-Limit': String(result.limit),
				'RateLimit-Remaining': String(result.remaining),
				'RateLimit-Reset': String(result.reset),
			},
		})
	}
	return new Response('Too Many Requests', {
		status: 429,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'RateLimit-Limit': String(result.limit),
			'RateLimit-Remaining': String(result.remaining),
			'RateLimit-Reset': String(result.reset),
		},
	})
}
