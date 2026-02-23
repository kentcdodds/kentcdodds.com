import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import {
	fetchJsonWithRetryAfter,
	getRetryDelayMsFromResponse,
} from '../fetch-json-with-retry-after.server.ts'

let requestCount = 0
const server = setupServer(
	http.get('https://example.com/test', () => {
		requestCount++
		if (requestCount === 1) {
			return HttpResponse.json(
				{ error: 'too_many_requests' },
				{
					status: 429,
					headers: { 'Retry-After': '2' },
				},
			)
		}
		return HttpResponse.json({ ok: true })
	}),
)

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
	requestCount = 0
})

afterAll(() => {
	server.close()
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
	const res = new Response(null, { status: 429, headers: { 'Retry-After': retryAfter } })

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

