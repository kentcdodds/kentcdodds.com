import { type RequestHandler, type Response } from 'express'
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit'
import { LRUCache } from 'lru-cache'
import { prisma } from '../app/utils/prisma.server.ts'
import { getSession } from '../app/utils/session.server.ts'

type ExpressRequest = Parameters<RequestHandler>[0]
type GetRequestUserEmail = (
	req: ExpressRequest,
) => Promise<string | null | undefined> | string | null | undefined

type CreateRateLimitingMiddlewareOptions = {
	mode?: string | undefined
	playwrightTestBaseUrl?: string | undefined
	getRequestUserEmail?: GetRequestUserEmail | undefined
}

const kcdSessionCookieName = 'KCD_root_session'
const kentEmail = 'me@kentcdodds.com'
const kentRateLimitMultiplier = 10
const sessionEmailCache = new LRUCache<string, string | null>({
	max: 10_000,
	ttl: 60 * 1000,
})
const requestEmailPromiseSymbol = Symbol('request-email-promise')
type RateLimitDefaults = Pick<
	Options,
	'windowMs' | 'standardHeaders' | 'legacyHeaders' | 'validate' | 'keyGenerator'
>

type RequestWithEmailPromise = ExpressRequest & {
	[requestEmailPromiseSymbol]?: Promise<string | null>
}

function getRequestIpKey(req: ExpressRequest) {
	const flyClientIp = req.get('fly-client-ip')
	const ip = flyClientIp ?? req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'
	return ipKeyGenerator(ip)
}

async function getSessionIdFromRequest(req: ExpressRequest) {
	const cookieHeader = req.get('cookie')
	if (!cookieHeader || !cookieHeader.includes(`${kcdSessionCookieName}=`)) {
		return null
	}

	const sessionRequest = new Request('http://localhost', {
		headers: { Cookie: cookieHeader },
	})
	const session = await getSession(sessionRequest)
	return session.getSessionId() ?? null
}

async function getRequestUserEmailFromSession(req: ExpressRequest) {
	const sessionId = await getSessionIdFromRequest(req)
	if (!sessionId) return null

	if (sessionEmailCache.has(sessionId)) {
		return sessionEmailCache.get(sessionId) ?? null
	}

	const sessionWithUser = await prisma.session.findUnique({
		where: { id: sessionId },
		select: {
			expirationDate: true,
			user: { select: { email: true } },
		},
	})
	if (!sessionWithUser || sessionWithUser.expirationDate.getTime() <= Date.now()) {
		sessionEmailCache.set(sessionId, null)
		return null
	}

	const email = sessionWithUser.user.email?.toLowerCase() ?? null
	sessionEmailCache.set(sessionId, email)
	return email
}

async function getCachedRequestUserEmail(
	req: ExpressRequest,
	getRequestUserEmail: NonNullable<
		CreateRateLimitingMiddlewareOptions['getRequestUserEmail']
	>,
) {
	const requestWithEmailPromise = req as RequestWithEmailPromise
	if (!requestWithEmailPromise[requestEmailPromiseSymbol]) {
		requestWithEmailPromise[requestEmailPromiseSymbol] = Promise.resolve(
			getRequestUserEmail(req),
		)
			.then((email) => email?.toLowerCase() ?? null)
			.catch((error: unknown) => {
				console.error(
					'Failed to resolve request user email for rate limiting:',
					error,
				)
				return null
			})
	}
	return requestWithEmailPromise[requestEmailPromiseSymbol]
}

async function sendRateLimitExceededResponse(
	req: ExpressRequest,
	res: Response,
	optionsUsed: Options,
) {
	const message =
		typeof optionsUsed.message === 'function'
			? await optionsUsed.message(req, res)
			: optionsUsed.message
	res.status(optionsUsed.statusCode).send(message)
}

function createRateLimiterWithKentBoost({
	baseLimit,
	rateLimitDefault,
	getRequestUserEmail,
}: {
	baseLimit: number
	rateLimitDefault: RateLimitDefaults
	getRequestUserEmail: GetRequestUserEmail
}): RequestHandler {
	const kentOverageLimit = baseLimit * (kentRateLimitMultiplier - 1)
	const kentOverageRateLimit = rateLimit({
		...rateLimitDefault,
		limit: kentOverageLimit,
		keyGenerator: (req: ExpressRequest) => `kent:${getRequestIpKey(req)}`,
	})

	return rateLimit({
		...rateLimitDefault,
		limit: baseLimit,
		handler: (req, res, next, optionsUsed) => {
			void getCachedRequestUserEmail(req, getRequestUserEmail)
				.then((userEmail) => {
					if (userEmail === kentEmail) {
						return kentOverageRateLimit(req, res, next)
					}
					return sendRateLimitExceededResponse(req, res, optionsUsed)
				})
				.catch((error: unknown) => next(error))
		},
	})
}

/**
 * Rate limiting middleware modeled after Epic Stack's `server/index.ts`.
 *
 * - In development we effectively disable limits to avoid slowing iteration.
 * - In Playwright we also effectively disable limits because tests can be fast
 *   enough to hit strict limits (especially on auth endpoints).
 * - In production the limits are enforced and keyed by `Fly-Client-Ip` when
 *   available (users cannot spoof this header on Fly.io).
 * - Kent's account gets a 10x limit multiplier in production.
 */
export function createRateLimitingMiddleware(
	options: CreateRateLimitingMiddlewareOptions = {},
): RequestHandler {
	const mode = options.mode ?? 'development'
	const isProd = mode === 'production'

	const isPlaywright = Boolean(options.playwrightTestBaseUrl)
	const getRequestUserEmail =
		options.getRequestUserEmail ?? getRequestUserEmailFromSession

	// When running tests or running in development, we want to effectively disable
	// rate limiting because Playwright tests are very fast and we don't want to
	// have to wait for the rate limit to reset between tests.
	const maxMultiple = !isProd || isPlaywright ? 10_000 : 1

	const rateLimitDefault = {
		windowMs: 60 * 1000,
		standardHeaders: true,
		legacyHeaders: false,
		validate: { trustProxy: false },
		// Malicious users can spoof their IP address which means we should not default
		// to trusting req.ip when hosted on Fly.io. However, users cannot spoof Fly-Client-Ip.
		// When sitting behind a CDN such as cloudflare, replace fly-client-ip with the CDN
		// specific header such as cf-connecting-ip
		keyGenerator: getRequestIpKey,
	}

	const strongestRateLimit =
		isProd && !isPlaywright
			? createRateLimiterWithKentBoost({
					baseLimit: 10,
					rateLimitDefault,
					getRequestUserEmail,
				})
			: rateLimit({
					...rateLimitDefault,
					limit: 10 * maxMultiple,
				})

	const strongRateLimit =
		isProd && !isPlaywright
			? createRateLimiterWithKentBoost({
					baseLimit: 100,
					rateLimitDefault,
					getRequestUserEmail,
				})
			: rateLimit({
					...rateLimitDefault,
					limit: 100 * maxMultiple,
				})

	const generalRateLimit =
		isProd && !isPlaywright
			? createRateLimiterWithKentBoost({
					baseLimit: 1000,
					rateLimitDefault,
					getRequestUserEmail,
				})
			: rateLimit({
					...rateLimitDefault,
					limit: 1000 * maxMultiple,
				})

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
