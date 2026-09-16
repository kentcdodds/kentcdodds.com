import { afterEach, expect, test, vi } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'
import { maybeHandleEmailMockFetch } from '../outbound-mock-email.server.ts'
import {
	EmailSendError,
	sendEmail,
	sendSignupVerificationEmail,
	toEmailSendingAddress,
} from '../send-email.server.ts'

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

function okSendResponse(to = 'paul@datascienceinstitute.ai') {
	return new Response(
		JSON.stringify({
			success: true,
			errors: [],
			messages: [],
			result: { delivered: [to], permanent_bounces: [], queued: [] },
		}),
		{ status: 200, headers: { 'content-type': 'application/json' } },
	)
}

function errorSendResponse({
	status,
	code,
	message,
}: {
	status: number
	code: number
	message: string
}) {
	return new Response(
		JSON.stringify({
			success: false,
			errors: [{ code, message }],
			messages: [],
			result: null,
		}),
		{ status, headers: { 'content-type': 'application/json' } },
	)
}

test('toEmailSendingAddress converts RFC 5322 senders to Cloudflare objects', () => {
	expect(
		toEmailSendingAddress('"Kent C. Dodds Team" <team+kcd@kentcdodds.com>'),
	).toEqual({
		address: 'team+kcd@kentcdodds.com',
		name: 'Kent C. Dodds Team',
	})
	expect(
		toEmailSendingAddress(
			'Ada (via KCD contact form) <contact@kentcdodds.com>',
		),
	).toEqual({
		address: 'contact@kentcdodds.com',
		name: 'Ada (via KCD contact form)',
	})
	expect(toEmailSendingAddress('paul@datascienceinstitute.ai')).toBe(
		'paul@datascienceinstitute.ai',
	)
	expect(toEmailSendingAddress('"Ada "AJ"" <ada@example.com>')).toEqual({
		address: 'ada@example.com',
		name: 'Ada "AJ"',
	})
})

test('sendEmail posts structured from/to/reply_to to Cloudflare Email Sending', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	const fetchMock = vi.fn().mockResolvedValue(okSendResponse())
	vi.stubGlobal('fetch', fetchMock)

	await sendEmail({
		to: '"Paul Save" <paul@datascienceinstitute.ai>',
		from: '"Kent C. Dodds Team" <team+kcd@kentcdodds.com>',
		replyTo: '"Ada" <ada@example.com>',
		subject: 'Your verification code for kentcdodds.com',
		text: 'code 123456',
		html: '<p>code 123456</p>',
	})

	expect(fetchMock).toHaveBeenCalledOnce()
	expect(fetchMock.mock.calls[0]?.[0]).toBe(
		'https://api.cloudflare.com/client/v4/accounts/acct-test/email/sending/send',
	)
	expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
		to: { address: 'paul@datascienceinstitute.ai', name: 'Paul Save' },
		from: {
			address: 'team+kcd@kentcdodds.com',
			name: 'Kent C. Dodds Team',
		},
		reply_to: { address: 'ada@example.com', name: 'Ada' },
		subject: 'Your verification code for kentcdodds.com',
		text: 'code 123456',
		html: '<p>code 123456</p>',
	})
})

test('signup verification email uses a structured team+kcd from address', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	const fetchMock = vi
		.fn()
		.mockResolvedValue(okSendResponse('paul@datascienceinstitute.ai'))
	vi.stubGlobal('fetch', fetchMock)

	await sendSignupVerificationEmail({
		emailAddress: 'paul@datascienceinstitute.ai',
		verificationCode: '123456',
		verificationUrl:
			'https://kentcdodds.com/signup?verification=11111111-1111-4111-8111-111111111111&code=123456',
		domainUrl: 'https://kentcdodds.com',
	})

	const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
		to: unknown
		from: unknown
		subject: string
	}
	expect(body.to).toBe('paul@datascienceinstitute.ai')
	expect(body.from).toEqual({
		address: 'team+kcd@kentcdodds.com',
		name: 'Kent C. Dodds Team',
	})
	expect(body.subject).toMatch(/verification code/i)
})

test('sendEmail throws EmailSendError with Cloudflare codes on 400', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	const fetchMock = vi.fn().mockResolvedValue(
		errorSendResponse({
			status: 400,
			code: 10001,
			message: 'email.sending.error.invalid_request_schema',
		}),
	)
	vi.stubGlobal('fetch', fetchMock)

	const error = await sendEmail({
		to: 'paul@datascienceinstitute.ai',
		from: 'team+kcd@kentcdodds.com',
		subject: 'Hi',
		text: 'Hi',
		html: 'Hi',
	}).catch((caught: unknown) => caught)

	expect(error).toBeInstanceOf(EmailSendError)
	expect(error).toMatchObject({
		status: 400,
		codes: [10001],
	})
	expect(fetchMock).toHaveBeenCalledOnce()
})

test('sendEmail treats HTTP 200 without an explicit success envelope as a failure', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			new Response('not-json', {
				status: 200,
				headers: { 'content-type': 'text/plain' },
			}),
		),
	)

	await expect(
		sendEmail({
			to: 'paul@datascienceinstitute.ai',
			from: 'team+kcd@kentcdodds.com',
			subject: 'Hi',
			text: 'Hi',
			html: 'Hi',
		}),
	).rejects.toMatchObject({
		name: 'EmailSendError',
		status: 200,
	})
})

test('sendEmail treats HTTP 200 with an empty JSON object as a failure', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			new Response('{}', {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		),
	)

	await expect(
		sendEmail({
			to: 'paul@datascienceinstitute.ai',
			from: 'team+kcd@kentcdodds.com',
			subject: 'Hi',
			text: 'Hi',
			html: 'Hi',
		}),
	).rejects.toMatchObject({
		name: 'EmailSendError',
		status: 200,
	})
})

test('sendEmail treats HTTP 200 with success:false as a failure', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			errorSendResponse({
				status: 200,
				code: 10202,
				message: 'email.sending.error.email.invalid',
			}),
		),
	)

	await expect(
		sendEmail({
			to: 'paul@datascienceinstitute.ai',
			from: 'team+kcd@kentcdodds.com',
			subject: 'Hi',
			text: 'Hi',
			html: 'Hi',
		}),
	).rejects.toMatchObject({
		name: 'EmailSendError',
		status: 200,
		codes: [10202],
	})
})

test('sendEmail retries a transient 429 then succeeds', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	const fetchMock = vi
		.fn()
		.mockResolvedValueOnce(
			errorSendResponse({
				status: 429,
				code: 10004,
				message: 'email.sending.error.throttled',
			}),
		)
		.mockResolvedValueOnce(okSendResponse())
	vi.stubGlobal('fetch', fetchMock)

	await sendEmail({
		to: 'paul@datascienceinstitute.ai',
		from: 'team+kcd@kentcdodds.com',
		subject: 'Hi',
		text: 'Hi',
		html: 'Hi',
	})

	expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('sendEmail does not retry a thrown fetch', async () => {
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'acct-test',
		CLOUDFLARE_API_TOKEN: 'token-test',
	})
	const fetchMock = vi
		.fn()
		.mockRejectedValueOnce(new TypeError('Failed to fetch'))
		.mockResolvedValueOnce(okSendResponse())
	vi.stubGlobal('fetch', fetchMock)

	await expect(
		sendEmail({
			to: 'paul@datascienceinstitute.ai',
			from: 'team+kcd@kentcdodds.com',
			subject: 'Hi',
			text: 'Hi',
			html: 'Hi',
		}),
	).rejects.toThrow('Failed to fetch')
	expect(fetchMock).toHaveBeenCalledOnce()
})

test('email mock serializes Cloudflare address objects for captured fixtures', async () => {
	let captured: Record<string, string> | undefined
	const response = await maybeHandleEmailMockFetch(
		new Request(
			'https://api.cloudflare.com/client/v4/accounts/test/email/sending/send',
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					to: { address: 'paul@datascienceinstitute.ai', name: 'Paul Save' },
					from: {
						address: 'team+kcd@kentcdodds.com',
						name: 'Kent C. Dodds Team',
					},
					subject: 'Your verification code for kentcdodds.com',
					text: 'code',
				}),
			},
		),
		{
			onOutboundEmail: (body) => {
				captured = body
			},
		},
	)

	expect(response?.ok).toBe(true)
	expect(captured).toMatchObject({
		to: 'paul@datascienceinstitute.ai',
		from: '"Kent C. Dodds Team" <team+kcd@kentcdodds.com>',
		subject: 'Your verification code for kentcdodds.com',
	})
})

test('email mock escapes quotes in captured display names', async () => {
	let captured: Record<string, string> | undefined
	const response = await maybeHandleEmailMockFetch(
		new Request(
			'https://api.cloudflare.com/client/v4/accounts/test/email/sending/send',
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					to: 'ada@example.com',
					from: { address: 'contact@kentcdodds.com', name: 'Ada "AJ"' },
					subject: 'Hi',
					text: 'Hi',
				}),
			},
		),
		{
			onOutboundEmail: (body) => {
				captured = body
			},
		},
	)

	expect(response?.ok).toBe(true)
	expect(captured?.from).toBe('"Ada \\"AJ\\"" <contact@kentcdodds.com>')
})
