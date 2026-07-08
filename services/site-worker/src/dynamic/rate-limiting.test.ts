import { afterEach, describe, expect, it } from 'vitest'
import {
	applyRateLimitHeaders,
	checkRateLimit,
	clearRateLimitWindowsForTests,
	createRateLimitedResponse,
	getAgentSearchHintHeaders,
} from './rate-limiting.ts'

let nextTestIp = 1

function testIp(label: string) {
	nextTestIp += 1
	return `203.0.113.${nextTestIp}:${label}`
}

function createRequest({
	method = 'GET',
	pathname = '/',
	headers = {},
}: {
	method?: string
	pathname?: string
	headers?: Record<string, string>
} = {}) {
	return new Request(`https://kentcdodds.com${pathname}`, {
		method,
		headers,
	})
}

function exhaustRateLimit(
	request: Request,
	count: number,
	{ mocks = false }: { mocks?: boolean } = {},
) {
	let last = checkRateLimit(request, { mocks })
	for (let i = 1; i < count; i++) {
		last = checkRateLimit(request, { mocks })
	}
	return last
}

afterEach(() => {
	clearRateLimitWindowsForTests()
})

describe('rate limiting (worker)', () => {
	it('uses strongest limiter for POST /login and keys by CF-Connecting-IP', () => {
		const ip = testIp('login-strongest')
		const request = createRequest({
			method: 'POST',
			pathname: '/login',
			headers: { 'CF-Connecting-IP': ip },
		})

		const allowed = exhaustRateLimit(request, 10)
		expect(allowed.tier).toBe('strongest')
		expect(allowed.allowed).toBe(true)
		expect(allowed.remaining).toBe(0)

		const tooMany = checkRateLimit(request)
		expect(tooMany.allowed).toBe(false)

		const differentIp = checkRateLimit(
			createRequest({
				method: 'POST',
				pathname: '/login',
				headers: { 'CF-Connecting-IP': testIp('login-other-ip') },
			}),
		)
		expect(differentIp.allowed).toBe(true)
		expect(differentIp.remaining).toBe(9)
	})

	it('falls back to Fly-Client-Ip when CF-Connecting-IP is absent', () => {
		const ip = testIp('fly-fallback')
		const request = createRequest({
			method: 'POST',
			pathname: '/login',
			headers: { 'Fly-Client-Ip': ip },
		})

		exhaustRateLimit(request, 10)
		expect(checkRateLimit(request).allowed).toBe(false)

		const differentIp = checkRateLimit(
			createRequest({
				method: 'POST',
				pathname: '/login',
				headers: { 'Fly-Client-Ip': testIp('fly-other') },
			}),
		)
		expect(differentIp.allowed).toBe(true)
	})

	it('uses strong limiter for non-GET requests on non-strongest paths', () => {
		const request = createRequest({
			method: 'POST',
			pathname: '/some-post-endpoint',
			headers: { 'CF-Connecting-IP': testIp('strong-post') },
		})

		const allowed = exhaustRateLimit(request, 100)
		expect(allowed.tier).toBe('strong')
		expect(allowed.allowed).toBe(true)

		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('uses strongest limiter for GET /magic', () => {
		const request = createRequest({
			pathname: '/magic',
			headers: { 'CF-Connecting-IP': testIp('magic-get') },
		})

		exhaustRateLimit(request, 10)
		expect(checkRateLimit(request).allowed).toBe(false)
		expect(checkRateLimit(request).tier).toBe('strongest')
	})

	it('uses strongest limiter for GET /discord/callback', () => {
		const request = createRequest({
			pathname: '/discord/callback?code=abc',
			headers: { 'CF-Connecting-IP': testIp('discord-callback') },
		})

		exhaustRateLimit(request, 10)
		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('uses strongest limiter for POST /resources/calls/save', () => {
		const request = createRequest({
			method: 'POST',
			pathname: '/resources/calls/save',
			headers: { 'CF-Connecting-IP': testIp('calls-save') },
		})

		exhaustRateLimit(request, 10)
		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('uses strongest limiter for POST /resources/calls/text-to-speech', () => {
		const request = createRequest({
			method: 'POST',
			pathname: '/resources/calls/text-to-speech',
			headers: { 'CF-Connecting-IP': testIp('tts') },
		})

		exhaustRateLimit(request, 10)
		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('uses strongest limiter for POST /action/mark-as-read', () => {
		const request = createRequest({
			method: 'POST',
			pathname: '/action/mark-as-read',
			headers: { 'CF-Connecting-IP': testIp('mark-read') },
		})

		exhaustRateLimit(request, 10)
		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('uses search limiter for GET /resources/search', () => {
		const request = createRequest({
			pathname: '/resources/search?query=react',
			headers: { 'CF-Connecting-IP': testIp('search') },
		})

		const allowed = exhaustRateLimit(request, 60)
		expect(allowed.tier).toBe('search')
		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('uses content index limiter for GET /sitemap.xml', () => {
		const request = createRequest({
			pathname: '/sitemap.xml',
			headers: { 'CF-Connecting-IP': testIp('sitemap') },
		})

		const allowed = exhaustRateLimit(request, 30)
		expect(allowed.tier).toBe('content-index')
		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('uses markdown limiter for GET requests accepting text/markdown', async () => {
		const request = createRequest({
			pathname: '/blog/some-post',
			headers: {
				Accept: 'text/markdown',
				'CF-Connecting-IP': testIp('markdown'),
			},
		})

		for (let i = 0; i < 9; i++) {
			const result = checkRateLimit(request)
			expect(result.tier).toBe('markdown')
			expect(result.allowed).toBe(true)
		}

		const halfway = checkRateLimit(request)
		expect(halfway.allowed).toBe(true)
		expect(halfway.remaining).toBe(10)
		const hints = getAgentSearchHintHeaders('/blog/some-post')
		expect(hints.Link).toContain(
			'</resources/search?query=blog%20some%20post>; rel="search"',
		)
		expect(hints['X-Agent-Search-Hint']).toContain(
			'/resources/search?query=blog%20some%20post',
		)

		exhaustRateLimit(request, 10)
		const blocked = checkRateLimit(request)
		expect(blocked.allowed).toBe(false)

		const response = createRateLimitedResponse(request, blocked)
		expect(response.status).toBe(429)
		expect(response.headers.get('content-type')).toContain('text/markdown')
		expect(response.headers.get('link')).toContain(
			'</resources/search?query=blog%20some%20post>; rel="search"',
		)
		expect(response.headers.get('x-agent-search-hint')).toContain(
			'/resources/search?query=blog%20some%20post',
		)
		expect(await response.text()).toContain(
			'/resources/search?query=blog%20some%20post',
		)
	})

	it('uses lowered general limiter for ordinary GET requests', () => {
		const request = createRequest({
			pathname: '/blog/some-post',
			headers: { 'CF-Connecting-IP': testIp('general') },
		})

		const allowed = exhaustRateLimit(request, 300)
		expect(allowed.tier).toBe('general')
		expect(checkRateLimit(request).allowed).toBe(false)
	})

	it('increments the window and computes remaining quota', () => {
		const request = createRequest({
			pathname: '/',
			headers: { 'CF-Connecting-IP': testIp('remaining-math') },
		})

		const first = checkRateLimit(request)
		expect(first.limit).toBe(300)
		expect(first.remaining).toBe(299)

		const second = checkRateLimit(request)
		expect(second.remaining).toBe(298)
		expect(second.reset).toBe(first.reset)
	})

	it('multiplies limits when mocks mode is enabled', () => {
		const request = createRequest({
			method: 'POST',
			pathname: '/some-post-endpoint',
			headers: { 'CF-Connecting-IP': testIp('mocks') },
		})

		expect(checkRateLimit(request, { mocks: true }).limit).toBe(100 * 10_000)
		expect(checkRateLimit(request, { mocks: false }).limit).toBe(100)
	})

	it('sets standard RateLimit headers via applyRateLimitHeaders', () => {
		const request = createRequest({
			headers: { 'CF-Connecting-IP': testIp('headers') },
		})
		const result = checkRateLimit(request)
		const headers = new Headers()
		applyRateLimitHeaders(headers, result)

		expect(headers.get('RateLimit-Limit')).toBe(String(result.limit))
		expect(headers.get('RateLimit-Remaining')).toBe(String(result.remaining))
		expect(headers.get('RateLimit-Reset')).toBe(String(result.reset))
		expect(headers.get('X-RateLimit-Limit')).toBeNull()
		expect(headers.get('X-RateLimit-Remaining')).toBeNull()
	})
})
