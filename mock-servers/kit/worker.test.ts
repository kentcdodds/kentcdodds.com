import { expect, test } from 'vitest'
import worker from './worker.ts'

test('mock meta endpoint reports dashboard capabilities', async () => {
	const response = await worker.fetch(
		new Request('http://mock-kit.local/__mocks/meta'),
		{},
		{} as any,
	)
	const json = (await response.json()) as {
		service: string
		themeSupport: Array<string>
		responsive: boolean
	}

	expect(response.status).toBe(200)
	expect(json.service).toBe('kit')
	expect(json.themeSupport).toEqual(['light', 'dark'])
	expect(json.responsive).toBe(true)
})

test('form subscription endpoint creates subscriber record', async () => {
	await worker.fetch(
		new Request('http://mock-kit.local/__mocks/reset', { method: 'POST' }),
		{},
		{} as any,
	)

	const subscribeResponse = await worker.fetch(
		new Request('http://mock-kit.local/v3/forms/123/subscribe', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				first_name: 'Ada',
				email: 'ada@example.com',
				fields: { role: 'admin' },
			}),
		}),
		{},
		{} as any,
	)
	const subscriptionPayload = (await subscribeResponse.json()) as {
		subscription: { subscriber: { email_address: string; first_name: string } }
	}
	expect(subscriptionPayload.subscription.subscriber.email_address).toBe(
		'ada@example.com',
	)
	expect(subscriptionPayload.subscription.subscriber.first_name).toBe('Ada')

	const subscribersResponse = await worker.fetch(
		new Request('http://mock-kit.local/v3/subscribers'),
		{},
		{} as any,
	)
	const subscribersPayload = (await subscribersResponse.json()) as {
		subscribers: Array<{ email_address: string }>
		total_subscribers: number
	}
	expect(subscribersPayload.total_subscribers).toBe(1)
	expect(subscribersPayload.subscribers[0]?.email_address).toBe('ada@example.com')
})
