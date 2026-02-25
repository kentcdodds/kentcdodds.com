import { expect, test } from 'vitest'
import worker from './worker.ts'

test('mailgun mock stores posted emails and exposes them', async () => {
	await worker.fetch(
		new Request('http://mock-mailgun.local/__mocks/reset', { method: 'POST' }),
		{},
		{} as any,
	)

	const body = new URLSearchParams({
		to: 'user@example.com',
		from: '"Team" <team@example.com>',
		subject: 'Hello',
		text: 'text body',
		html: '<p>html body</p>',
	})
	const response = await worker.fetch(
		new Request('http://mock-mailgun.local/v3/example.com/messages', {
			method: 'POST',
			body,
		}),
		{},
		{} as any,
	)
	expect(response.status).toBe(200)

	const emailListResponse = await worker.fetch(
		new Request('http://mock-mailgun.local/__mocks/emails'),
		{},
		{} as any,
	)
	const payload = (await emailListResponse.json()) as {
		emails: Array<{ to: string; subject: string }>
	}
	expect(payload.emails).toHaveLength(1)
	expect(payload.emails[0]).toEqual(
		expect.objectContaining({
			to: 'user@example.com',
			subject: 'Hello',
		}),
	)
})
