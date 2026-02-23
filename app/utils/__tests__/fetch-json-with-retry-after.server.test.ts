import { expect, test, vi } from 'vitest'
import {
	fetchJsonWithRetryAfter,
	getRetryDelayMsFromResponse,
} from '../fetch-json-with-retry-after.server.ts'

test('fetchJsonWithRetryAfter waits Retry-After seconds on 429 then retries', async () => {
	const sleep = vi.fn(async () => {})
	const fetchImpl = vi
		.fn()
		.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'too_many_requests' }), {
				status: 429,
				headers: { 'Retry-After': '2', 'Content-Type': 'application/json' },
			}),
		)
		.mockResolvedValueOnce(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		)

	const json = await fetchJsonWithRetryAfter<{ ok: boolean }>(
		'https://example.com/test',
		{
			label: 'test',
			maxRetries: 1,
			fetchImpl: fetchImpl as any,
			sleep,
		},
	)

	expect(json.ok).toBe(true)
	expect(fetchImpl).toHaveBeenCalledTimes(2)
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

