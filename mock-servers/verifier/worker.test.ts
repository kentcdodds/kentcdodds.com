import { expect, test } from 'vitest'
import worker from './worker.ts'

test('meta endpoint reports theme and responsive dashboard support', async () => {
	const response = await worker.fetch(
		new Request('http://mock-verifier.local/__mocks/meta'),
		{},
		{} as any,
	)
	const payload = (await response.json()) as {
		service: string
		themeSupport: Array<string>
		responsive: boolean
	}

	expect(payload.service).toBe('verifier')
	expect(payload.themeSupport).toEqual(['light', 'dark'])
	expect(payload.responsive).toBe(true)
})

test('verify endpoint returns deterministic validity result', async () => {
	const validResponse = await worker.fetch(
		new Request('http://mock-verifier.local/verify/ada@example.com'),
		{},
		{} as any,
	)
	const validPayload = (await validResponse.json()) as { status: boolean }
	expect(validPayload.status).toBe(true)

	const invalidResponse = await worker.fetch(
		new Request('http://mock-verifier.local/verify/user@invalid.test'),
		{},
		{} as any,
	)
	const invalidPayload = (await invalidResponse.json()) as { status: boolean }
	expect(invalidPayload.status).toBe(false)
})
