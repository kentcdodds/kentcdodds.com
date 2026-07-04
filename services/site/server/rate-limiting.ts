import { type RequestHandler } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

type RateLimitInfo = {
	limit: number
	remaining: number
	resetTime?: Date
}

type RateLimitedRequest = Parameters<RequestHandler>[0] & {
	rateLimit?: RateLimitInfo
}

type CreateRateLimitingMiddlewareOptions = {
	mode?: string | undefined
	mocks?: boolean | undefined
}

function getSearchHintQuery(path: string) {
	return path
		.replace(/^\/+/, '')
		.replace(/[-_./]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function getAgentSearchPath(req: Parameters<RequestHandler>[0]) {
	const query = getSearchHintQuery(req.path)
	if (!query) return '/resources/search?query='
	return `/resources/search?query=${encodeURIComponent(query)}`
}

function setAgentSearchHintHeaders(
	req: Parameters<RequestHandler>[0],
	res: Parameters<RequestHandler>[1],
) {
	const searchPath = getAgentSearchPath(req)
	res.setHeader(
		'Link',
		`<${searchPath}>; rel="search"; type="application/json"`,
	)
	res.setHeader(
		'X-Agent-Search-Hint',
		`Agents should use ${searchPath} for semantic search instead of bulk markdown scraping.`,
	)
}

function getAgentSearchHintMarkdown(req: Parameters<RequestHandler>[0]) {
	const searchPath = getAgentSearchPath(req)
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

/**
 * Rate limiting middleware modeled after Epic Stack's `server/index.ts`.
 *
 * - In development we effectively disable limits to avoid slowing iteration.
 * - In production the limits are enforced and keyed by `Fly-Client-Ip` when
 *   available (harmless fallback when not behind Fly; prefer `cf-connecting-ip`
 *   when behind Cloudflare).
 */
export function createRateLimitingMiddleware(
	options: CreateRateLimitingMiddlewareOptions = {},
): RequestHandler {
	const mode = options.mode ?? 'development'
	const isProd = mode === 'production'
	const isMocks = options.mocks ?? false

	// When running in development or mocks, we want to effectively disable rate
	// limiting so iteration and tests stay fast. Production keeps the real limits.
	const maxMultiple = !isProd || isMocks ? 10_000 : 1

	const rateLimitDefault = {
		windowMs: 60 * 1000,
		limit: 300 * maxMultiple,
		standardHeaders: true,
		legacyHeaders: false,
		validate: { trustProxy: false },
		// Malicious users can spoof their IP address which means we should not default
		// to trusting req.ip when hosted behind a proxy. When sitting behind a CDN such
		// as Cloudflare, prefer cf-connecting-ip; Fly-Client-Ip remains as a harmless
		// fallback for older proxy headers.
		keyGenerator: (req: Parameters<RequestHandler>[0]) => {
			const flyClientIp = req.get('fly-client-ip')
			const ip = flyClientIp ?? req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'
			return ipKeyGenerator(ip)
		},
	}

	const strongestRateLimit = rateLimit({
		...rateLimitDefault,
		limit: 10 * maxMultiple,
	})

	const strongRateLimit = rateLimit({
		...rateLimitDefault,
		limit: 100 * maxMultiple,
	})

	const searchRateLimit = rateLimit({
		...rateLimitDefault,
		limit: 60 * maxMultiple,
	})

	const contentIndexRateLimit = rateLimit({
		...rateLimitDefault,
		limit: 30 * maxMultiple,
	})

	const markdownRateLimit = rateLimit({
		...rateLimitDefault,
		limit: 20 * maxMultiple,
		handler: (req, res) => {
			setAgentSearchHintHeaders(req, res)
			res
				.status(429)
				.type('text/markdown')
				.send(getAgentSearchHintMarkdown(req))
		},
	})

	const generalRateLimit = rateLimit(rateLimitDefault)

	return (req, res, next) => {
		// These should match real app routes. Update alongside
		// `npx react-router routes` output.
		const strongestNonGetPaths = [
			'/login',
			'/signup',
			'/forgot-password',
			'/reset-password',
			'/me/password',
			'/oauth/authorize',
			// Covers: /calls/admin, /cache/admin, /me/admin, /search/admin
			'/admin',
			'/resources/calls/save',
			'/resources/calls/text-to-speech',
			'/resources/webauthn',
			'/action/mark-as-read',
		]

		if (req.method !== 'GET' && req.method !== 'HEAD') {
			if (strongestNonGetPaths.some((p) => req.path.includes(p))) {
				return strongestRateLimit(req, res, next)
			}
			return strongRateLimit(req, res, next)
		}

		// GET routes that can include sensitive tokens/codes in the query string.
		const strongestGetPaths = [
			'/magic',
			'/discord/callback',
			'/signup',
			'/reset-password',
		]
		if (strongestGetPaths.some((p) => req.path.includes(p))) {
			return strongestRateLimit(req, res, next)
		}

		// Markdown negotiation renders the normal route, then converts HTML to
		// markdown server-side. Keep agent-style scraping from turning CPU-bound.
		if (req.accepts(['html', 'text/markdown']) === 'text/markdown') {
			return markdownRateLimit(req, res, () => {
				const limit = (req as RateLimitedRequest).rateLimit
				if (limit && limit.remaining <= limit.limit / 2) {
					setAgentSearchHintHeaders(req, res)
				}
				next()
			})
		}

		// Search calls the dedicated search worker and can fan out into result
		// enrichment/cache work, so keep it tighter than ordinary document loads.
		const searchGetPaths = ['/search', '/resources/search']
		if (searchGetPaths.some((p) => req.path === p)) {
			return searchRateLimit(req, res, next)
		}

		// These bulk/index routes are useful for crawlers and agents, but legitimate
		// clients should not need to fetch them hundreds of times per minute.
		const contentIndexGetPaths = [
			'/sitemap.xml',
			'/blog/rss.xml',
			'/blog.json',
			'/.well-known/api-catalog',
			'/.well-known/api-docs',
			'/openapi.json',
		]
		if (contentIndexGetPaths.some((p) => req.path === p)) {
			return contentIndexRateLimit(req, res, next)
		}

		return generalRateLimit(req, res, next)
	}
}
