import { type RequestHandler } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

type CreateRateLimitingMiddlewareOptions = {
	mode?: string | undefined
	playwrightTestBaseUrl?: string | undefined
}

/**
 * Rate limiting middleware modeled after Epic Stack's `server/index.ts`.
 *
 * - In development we effectively disable limits to avoid slowing iteration.
 * - In Playwright we also effectively disable limits because tests can be fast
 *   enough to hit strict limits (especially on auth endpoints).
 * - In production the limits are enforced and keyed by Cloudflare/CDN
 *   forwarding headers (`CF-Connecting-IP` first, then `X-Forwarded-For`).
 */
export function createRateLimitingMiddleware(
	options: CreateRateLimitingMiddlewareOptions = {},
): RequestHandler {
	const mode = options.mode ?? 'development'
	const isProd = mode === 'production'

	const isPlaywright = Boolean(options.playwrightTestBaseUrl)

	// When running tests or running in development, we want to effectively disable
	// rate limiting because Playwright tests are very fast and we don't want to
	// have to wait for the rate limit to reset between tests.
	const maxMultiple = !isProd || isPlaywright ? 10_000 : 1

	const rateLimitDefault = {
		windowMs: 60 * 1000,
		limit: 1000 * maxMultiple,
		standardHeaders: true,
		legacyHeaders: false,
		validate: { trustProxy: false },
		// Prefer Cloudflare/CDN-provided IP headers before Express-derived values.
		keyGenerator: (req: Parameters<RequestHandler>[0]) => {
			const cfConnectingIp = req.get('cf-connecting-ip')
			const forwardedFor = req.get('x-forwarded-for')
			const forwardedIp = forwardedFor?.split(',')[0]?.trim()
			const ip =
				cfConnectingIp ??
				forwardedIp ??
				req.ip ??
				req.socket?.remoteAddress ??
				'0.0.0.0'
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
			'/resources/webauthn',
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

		return generalRateLimit(req, res, next)
	}
}
