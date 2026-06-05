import { describe, expect, test } from 'vitest'
import { handleRequest } from './index'

describe('site worker', () => {
	test('returns ok from GET /health', async () => {
		const response = await handleRequest(
			new Request('https://example.com/health'),
		)

		await expect(response.json()).resolves.toEqual({ ok: true })
		expect(response.status).toBe(200)
	})

	test('rejects non-GET /health requests', async () => {
		const response = await handleRequest(
			new Request('https://example.com/health', { method: 'POST' }),
		)

		await expect(response.json()).resolves.toEqual({
			ok: false,
			error: 'Method not allowed',
		})
		expect(response.status).toBe(405)
		expect(response.headers.get('Allow')).toBe('GET')
	})

	test('returns not found for other paths', async () => {
		const response = await handleRequest(new Request('https://example.com/'))

		await expect(response.json()).resolves.toEqual({
			ok: false,
			error: 'Not found',
		})
		expect(response.status).toBe(404)
	})
})
