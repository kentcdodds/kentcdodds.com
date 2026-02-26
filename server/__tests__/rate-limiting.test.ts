// @vitest-environment node
import { type Server } from 'node:http'
import express from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRateLimitingMiddleware } from '../rate-limiting.js'

async function startTestServer(
	options: Parameters<typeof createRateLimitingMiddleware>[0] = {},
) {
	const previousPlaywrightBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL
	// Ensure production-mode limits are enforced for these tests.
	process.env.PLAYWRIGHT_TEST_BASE_URL = ''

	const app = express()
	app.set('trust proxy', true)
	app.use(
		createRateLimitingMiddleware({
			mode: 'production',
			...options,
		}),
	)

	app.all(/.*/, (_req, res) => res.status(200).send('ok'))

	const server = await new Promise<Server>((resolve) => {
		const s = app.listen(0, () => resolve(s))
	})
	const address = server.address()
	if (!address || typeof address === 'string') {
		throw new Error('Expected server to be listening on a TCP port')
	}

	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		close: () =>
			new Promise<void>((resolve, reject) => {
				server.close((err) => (err ? reject(err) : resolve()))
			}).finally(() => {
				process.env.PLAYWRIGHT_TEST_BASE_URL = previousPlaywrightBaseUrl
			}),
	}
}

type Started = Awaited<ReturnType<typeof startTestServer>>
type RateLimitingMiddlewareOptions = Parameters<
	typeof createRateLimitingMiddleware
>[0]

let started: Started | null = null
afterEach(async () => {
	if (started) {
		await started.close()
		started = null
	}
})

describe('rate limiting (epic-stack style)', () => {
	it('uses strongest limiter for POST /login and keys by Fly-Client-Ip', async () => {
		started = await startTestServer()

		for (let i = 0; i < 10; i++) {
			const r = await fetch(`${started.baseUrl}/login`, {
				method: 'POST',
				headers: { 'fly-client-ip': '1.1.1.1' },
			})
			expect(r.status).toBe(200)
		}

		const tooMany = await fetch(`${started.baseUrl}/login`, {
			method: 'POST',
			headers: { 'fly-client-ip': '1.1.1.1' },
		})
		expect(tooMany.status).toBe(429)

		// A different Fly-Client-Ip should get its own bucket.
		const differentIp = await fetch(`${started.baseUrl}/login`, {
			method: 'POST',
			headers: { 'fly-client-ip': '2.2.2.2' },
		})
		expect(differentIp.status).toBe(200)
	})

	it('uses strong limiter for non-GET requests on non-strongest paths', async () => {
		started = await startTestServer()

		for (let i = 0; i < 100; i++) {
			const r = await fetch(`${started.baseUrl}/some-post-endpoint`, {
				method: 'POST',
			})
			expect(r.status).toBe(200)
		}

		const tooMany = await fetch(`${started.baseUrl}/some-post-endpoint`, {
			method: 'POST',
		})
		expect(tooMany.status).toBe(429)
	})

	it('only resolves user email after requests exceed the base limit', async () => {
		const resolveEmail: NonNullable<
			RateLimitingMiddlewareOptions['getRequestUserEmail']
		> = (req) => req.get('x-test-email') ?? null
		const getRequestUserEmail = vi.fn(resolveEmail)
		started = await startTestServer({
			getRequestUserEmail,
		})

		for (let i = 0; i < 10; i++) {
			const r = await fetch(`${started.baseUrl}/login`, {
				method: 'POST',
				headers: {
					'fly-client-ip': '4.4.4.4',
					'x-test-email': 'me@kentcdodds.com',
				},
			})
			expect(r.status).toBe(200)
		}
		expect(getRequestUserEmail).not.toHaveBeenCalled()

		const eleventh = await fetch(`${started.baseUrl}/login`, {
			method: 'POST',
			headers: {
				'fly-client-ip': '4.4.4.4',
				'x-test-email': 'me@kentcdodds.com',
			},
		})
		expect(eleventh.status).toBe(200)
		expect(getRequestUserEmail).toHaveBeenCalledTimes(1)
	})

	it('gives me@kentcdodds.com a 10x stronger limit without sharing that bucket by IP', async () => {
		started = await startTestServer({
			getRequestUserEmail: (req) => req.get('x-test-email') ?? null,
		})

		for (let i = 0; i < 100; i++) {
			const kentResponse = await fetch(`${started.baseUrl}/login`, {
				method: 'POST',
				headers: {
					'fly-client-ip': '3.3.3.3',
					'x-test-email': 'me@kentcdodds.com',
				},
			})
			expect(kentResponse.status).toBe(200)
		}

		const kentTooMany = await fetch(`${started.baseUrl}/login`, {
			method: 'POST',
			headers: {
				'fly-client-ip': '3.3.3.3',
				'x-test-email': 'me@kentcdodds.com',
			},
		})
		expect(kentTooMany.status).toBe(429)

		for (let i = 0; i < 10; i++) {
			const regularResponse = await fetch(`${started.baseUrl}/login`, {
				method: 'POST',
				headers: { 'fly-client-ip': '3.3.3.3' },
			})
			expect(regularResponse.status).toBe(200)
		}
		const regularTooMany = await fetch(`${started.baseUrl}/login`, {
			method: 'POST',
			headers: { 'fly-client-ip': '3.3.3.3' },
		})
		expect(regularTooMany.status).toBe(429)
	})

	it('uses strongest limiter for GET /magic (token-in-query style route)', async () => {
		started = await startTestServer()

		for (let i = 0; i < 10; i++) {
			const r = await fetch(`${started.baseUrl}/magic`)
			expect(r.status).toBe(200)
		}

		const tooMany = await fetch(`${started.baseUrl}/magic`)
		expect(tooMany.status).toBe(429)
	})

	it('uses strongest limiter for GET /discord/callback (oauth code in query)', async () => {
		started = await startTestServer()

		for (let i = 0; i < 10; i++) {
			const r = await fetch(`${started.baseUrl}/discord/callback?code=abc`)
			expect(r.status).toBe(200)
		}

		const tooMany = await fetch(`${started.baseUrl}/discord/callback?code=abc`)
		expect(tooMany.status).toBe(429)
	})

	it('uses strongest limiter for POST /resources/calls/save (large payload endpoint)', async () => {
		started = await startTestServer()

		for (let i = 0; i < 10; i++) {
			const r = await fetch(`${started.baseUrl}/resources/calls/save`, {
				method: 'POST',
			})
			expect(r.status).toBe(200)
		}

		const tooMany = await fetch(`${started.baseUrl}/resources/calls/save`, {
			method: 'POST',
		})
		expect(tooMany.status).toBe(429)
	})

	it('sets standard RateLimit headers and disables legacy X-RateLimit headers', async () => {
		started = await startTestServer()

		const r = await fetch(`${started.baseUrl}/`)
		expect(r.status).toBe(200)

		// Header names are case-insensitive; Node fetch exposes them lower-cased.
		expect(r.headers.get('ratelimit-limit')).toBeTruthy()
		expect(r.headers.get('ratelimit-remaining')).toBeTruthy()
		expect(r.headers.get('x-ratelimit-limit')).toBeNull()
		expect(r.headers.get('x-ratelimit-remaining')).toBeNull()
	})
})
