import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('oembed mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-oembed.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('oembed')
	})

	test('returns providers and endpoint payloads', async () => {
		const providersResponse = await worker.fetch(
			new Request('http://mock-oembed.local/providers.json'),
			{},
			{},
		)
		expect(providersResponse.status).toBe(200)
		const providersPayload = (await providersResponse.json()) as Array<{
			provider_name: string
			endpoints: Array<{ url: string }>
		}>
		expect(providersPayload.length).toBeGreaterThan(0)
		expect(providersPayload[0]?.endpoints[0]?.url).toContain(
			'http://mock-oembed.local/providers/',
		)

		const twitterResponse = await worker.fetch(
			new Request(
				'http://mock-oembed.local/providers/twitter?url=https%3A%2F%2Fx.com%2Fkentcdodds%2Fstatus%2F1',
			),
			{},
			{},
		)
		expect(twitterResponse.status).toBe(200)
		const twitterPayload = (await twitterResponse.json()) as { html: string }
		expect(twitterPayload.html).toContain('twitter-tweet')
	})
})
