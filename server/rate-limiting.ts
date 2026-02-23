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
 * - In production the limits are enforced and keyed by `Fly-Client-Ip` when
 *   available (users cannot spoof this header on Fly.io).
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
		// Malicious users can spoof their IP address which means we should not default
		// to trusting req.ip when hosted on Fly.io. However, users cannot spoof Fly-Client-Ip.
		// When sitting behind a CDN such as cloudflare, replace fly-client-ip with the CDN
		// specific header such as cf-connecting-ip
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
