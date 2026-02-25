import { expect, test } from 'vitest'
import worker from './worker.ts'

test('meta endpoint advertises dashboard capabilities', async () => {
	const response = await worker.fetch(
		new Request('http://mock-oauth.local/__mocks/meta'),
		{},
		{} as any,
	)
	const payload = (await response.json()) as {
		service: string
		themeSupport: Array<string>
		responsive: boolean
	}

	expect(payload.service).toBe('oauth')
	expect(payload.themeSupport).toEqual(['light', 'dark'])
	expect(payload.responsive).toBe(true)
})

test('validate-token endpoint accepts and rejects tokens', async () => {
	const unauthorized = await worker.fetch(
		new Request('http://mock-oauth.local/api/validate-token'),
		{},
		{} as any,
	)
	expect(unauthorized.status).toBe(401)

	const valid = await worker.fetch(
		new Request('http://mock-oauth.local/api/validate-token', {
			headers: { authorization: 'Bearer user:abc123' },
		}),
		{},
		{} as any,
	)
	const validPayload = (await valid.json()) as { userId?: string }
	expect(valid.status).toBe(200)
	expect(validPayload.userId).toBe('abc123')
})
