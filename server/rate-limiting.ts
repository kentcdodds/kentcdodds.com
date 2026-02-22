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
	const mode = options.mode ?? process.env.NODE_ENV ?? 'development'
	const isProd = mode === 'production'

	const isPlaywright =
		Boolean(options.playwrightTestBaseUrl) ||
		Boolean(process.env.PLAYWRIGHT_TEST_BASE_URL)

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
			const ip = req.ip ?? req.socket?.remoteAddress
			return req.get('fly-client-ip') ?? ipKeyGenerator(ip ?? '0.0.0.0')
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
		const strongestPaths = [
			'/login',
			'/signup',
			'/verify',
			'/admin',
			'/onboarding',
			'/reset-password',
			'/settings/profile',
			'/resources/login',
			'/resources/verify',
			'/resources/webauthn',
		]

		if (req.method !== 'GET' && req.method !== 'HEAD') {
			if (strongestPaths.some((p) => req.path.includes(p))) {
				return strongestRateLimit(req, res, next)
			}
			return strongRateLimit(req, res, next)
		}

		// Magic link verification is a special case because it is a GET route that
		// can have a token in the query string.
		if (req.path.includes('/magic')) {
			return strongestRateLimit(req, res, next)
		}

		// The verify route is a special case in Epic Stack because it's a GET route
		// that can have a token in the query string.
		if (req.path.includes('/verify')) {
			return strongestRateLimit(req, res, next)
		}

		return generalRateLimit(req, res, next)
	}
}

