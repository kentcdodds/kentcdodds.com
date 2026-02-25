import { expect, test } from 'vitest'
import worker from '../worker.ts'

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
		text: `Verification code:
ABC123

Or click this link:
https://kentcdodds.com/signup?verification=abc&code=ABC123`,
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
		emails: Array<{
			id: number
			to: string
			subject: string
			verificationCode: string | null
		}>
	}
	expect(payload.emails).toHaveLength(1)
	expect(payload.emails[0]).toEqual(
		expect.objectContaining({
			to: 'user@example.com',
			subject: 'Hello',
			verificationCode: 'ABC123',
		}),
	)

	const latestEmailResponse = await worker.fetch(
		new Request('http://mock-mailgun.local/__mocks/emails/latest?to=user@example.com'),
		{},
		{} as any,
	)
	expect(latestEmailResponse.status).toBe(200)
	const latestPayload = (await latestEmailResponse.json()) as {
		email: { id: number; to: string; verificationCode: string | null }
	}
	expect(latestPayload.email).toEqual(
		expect.objectContaining({
			id: payload.emails[0]?.id,
			to: 'user@example.com',
			verificationCode: 'ABC123',
		}),
	)

	const detailResponse = await worker.fetch(
		new Request(
			`http://mock-mailgun.local/__mocks/emails/${latestPayload.email.id}`,
		),
		{},
		{} as any,
	)
	expect(detailResponse.status).toBe(200)
	const detailPayload = (await detailResponse.json()) as {
		email: { to: string; verificationCode: string | null }
	}
	expect(detailPayload.email).toEqual(
		expect.objectContaining({
			to: 'user@example.com',
			verificationCode: 'ABC123',
		}),
	)
})
