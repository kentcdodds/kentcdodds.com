import { beforeEach, expect, test, vi } from 'vitest'
import {
	fetchJsonWithRetryAfter,
	getRetryDelayMsFromResponse,
} from '../fetch-json-with-retry-after.server.ts'

let requestCount = 0
let always429Count = 0
let flaky500Count = 0
let networkErrorCount = 0

beforeEach(() => {
	requestCount = 0
	always429Count = 0
	flaky500Count = 0
	networkErrorCount = 0
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url =
				typeof input === 'string'
					? input
					: input instanceof URL
						? input.toString()
						: input.url
			if (url === 'https://example.com/test') {
				requestCount++
				if (requestCount === 1) {
					return Response.json(
						{ error: 'too_many_requests' },
						{
							status: 429,
							headers: { 'Retry-After': '2' },
						},
					)
				}
				return Response.json({ ok: true })
			}
			if (url === 'https://example.com/always-429') {
				always429Count++
				return Response.json(
					{ error: 'too_many_requests' },
					{
						status: 429,
						headers: { 'Retry-After': '1' },
					},
				)
			}
			if (url === 'https://example.com/flaky-500') {
				flaky500Count++
				if (flaky500Count === 1) {
					return Response.json({ error: 'server' }, { status: 500 })
				}
				return Response.json({ ok: true })
			}
			if (url === 'https://example.com/network-error') {
				networkErrorCount++
				if (networkErrorCount === 1) {
					throw new TypeError('network error')
				}
				return Response.json({ ok: true })
			}
			if (url === 'https://example.com/bad-json') {
				return new Response('not-json', {
					status: 200,
					statusText: 'OK',
					headers: { 'Content-Type': 'application/json' },
				})
			}
			throw new Error(`Unexpected fetch in test: ${url}`)
		}),
	)
})

test('fetchJsonWithRetryAfter waits Retry-After seconds on 429 then retries', async () => {
	const sleep = vi.fn(async () => {})

	const json = await fetchJsonWithRetryAfter<{ ok: boolean }>(
		'https://example.com/test',
		{
			label: 'test',
			maxRetries: 1,
			sleep,
		},
	)

	expect(json.ok).toBe(true)
	expect(requestCount).toBe(2)
	expect(sleep).toHaveBeenCalledTimes(1)
	expect(sleep).toHaveBeenCalledWith(2000)
})

test('getRetryDelayMsFromResponse parses Retry-After HTTP-date', () => {
	const nowMs = Date.parse('2026-02-23T00:00:00.000Z')
	const retryAfter = new Date(nowMs + 5000).toUTCString()
	const res = new Response(null, {
		status: 429,
		headers: { 'Retry-After': retryAfter },
	})

	const delay = getRetryDelayMsFromResponse(res, { nowMs })
	expect(delay.reason).toBe('retry-after')
	expect(delay.delayMs).toBe(5000)
})

test('getRetryDelayMsFromResponse falls back to default delay when header is missing', () => {
	const res = new Response(null, { status: 429 })
	const delay = getRetryDelayMsFromResponse(res, {
		nowMs: 0,
		defaultDelayMs: 1234,
		maxDelayMs: 10_000,
	})
	expect(delay.reason).toBe('default')
	expect(delay.delayMs).toBe(1234)
})

test('getRetryDelayMsFromResponse uses RateLimit-Reset epoch seconds when present', () => {
	const nowMs = 1700000000 * 1000
	const res = new Response(null, {
		status: 429,
		headers: { 'RateLimit-Reset': String(1700000005) },
	})
	const delay = getRetryDelayMsFromResponse(res, { nowMs })
	expect(delay.reason).toBe('rate-limit-reset')
	expect(delay.delayMs).toBe(5000)
})

test('fetchJsonWithRetryAfter throws after exhausting 429 retries', async () => {
	const sleep = vi.fn(async () => {})

	await expect(
		fetchJsonWithRetryAfter('https://example.com/always-429', {
			label: 'always-429',
			maxRetries: 1,
			sleep,
		}),
	).rejects.toThrow(/always-429: 429 Too Many Requests/i)

	expect(always429Count).toBe(2)
	expect(sleep).toHaveBeenCalledTimes(1)
})

test('fetchJsonWithRetryAfter retries 5xx when retryOn5xx is enabled', async () => {
	const sleep = vi.fn(async () => {})
	const json = await fetchJsonWithRetryAfter<{ ok: boolean }>(
		'https://example.com/flaky-500',
		{
			label: 'flaky-500',
			maxRetries: 1,
			defaultDelayMs: 123,
			retryOn5xx: true,
			sleep,
		},
	)

	expect(json.ok).toBe(true)
	expect(flaky500Count).toBe(2)
	expect(sleep).toHaveBeenCalledWith(123)
})

test('fetchJsonWithRetryAfter retries when fetch throws (network error / abort)', async () => {
	const sleep = vi.fn(async () => {})
	const json = await fetchJsonWithRetryAfter<{ ok: boolean }>(
		'https://example.com/network-error',
		{
			label: 'network-error',
			maxRetries: 1,
			defaultDelayMs: 456,
			sleep,
		},
	)

	expect(json.ok).toBe(true)
	expect(networkErrorCount).toBe(2)
	expect(sleep).toHaveBeenCalledWith(456)
})

test('fetchJsonWithRetryAfter throws a labeled error on malformed JSON', async () => {
	const sleep = vi.fn(async () => {})
	await expect(
		fetchJsonWithRetryAfter('https://example.com/bad-json', {
			label: 'bad-json',
			sleep,
		}),
	).rejects.toThrow(/bad-json: failed to parse JSON \(200 OK\)/i)

	expect(sleep).not.toHaveBeenCalled()
})
