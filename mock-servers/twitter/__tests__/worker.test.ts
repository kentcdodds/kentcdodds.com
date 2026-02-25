import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('twitter mock worker', () => {
	test('returns metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-twitter.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('twitter')
	})

	test('supports tweet-result, short links, and oembed', async () => {
		const tweetResponse = await worker.fetch(
			new Request(
				'http://mock-twitter.local/tweet-result?id=783161196945944580&lang=en',
			),
			{},
			{},
		)
		expect(tweetResponse.status).toBe(200)
		const tweetPayload = (await tweetResponse.json()) as { id_str: string }
		expect(tweetPayload.id_str).toBe('783161196945944580')

		const shortHeadResponse = await worker.fetch(
			new Request('http://mock-twitter.local/short/783161196945944580', {
				method: 'HEAD',
			}),
			{},
			{},
		)
		expect(shortHeadResponse.status).toBe(200)
		expect(shortHeadResponse.headers.get('location')).toContain(
			'https://x.com/kentcdodds/status/783161196945944580',
		)

		const oembedResponse = await worker.fetch(
			new Request(
				'http://mock-twitter.local/oembed?url=https%3A%2F%2Fx.com%2Fkentcdodds%2Fstatus%2F783161196945944580',
			),
			{},
			{},
		)
		expect(oembedResponse.status).toBe(200)
		const oembedPayload = (await oembedResponse.json()) as { html: string }
		expect(oembedPayload.html).toContain('twitter-tweet')
	})
})
