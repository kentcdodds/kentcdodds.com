// @vitest-environment node
import { expect, test } from 'vitest'

import { action, getPromoCookieValue, loader } from '../promotification.tsx'

function makeRequest(formData: FormData) {
	return new Request('http://localhost/resources/promotification', {
		method: 'POST',
		body: formData,
	})
}

test('action stores a hidden cookie for a valid promo name', async () => {
	const formData = new FormData()
	formData.set('promoName', 'kody-launch-2026-09')
	formData.set('maxAge', String(60 * 60 * 24))

	const result = (await action({
		request: makeRequest(formData),
	} as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBeUndefined()
	const cookieHeader = new Headers(result.init?.headers).get('Set-Cookie')
	expect(cookieHeader).toContain('kody-launch-2026-09=hidden')
	expect(cookieHeader).toContain('Max-Age=86400')
})

test('action rejects invalid promo names', async () => {
	const formData = new FormData()
	formData.set('promoName', 'invalid promo name')

	const result = (await action({
		request: makeRequest(formData),
	} as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(400)
	expect(result.data).toEqual({
		success: false,
		error: 'Invalid promoName',
	})
})

test('action caps one-time promo cookie max age', async () => {
	const formData = new FormData()
	formData.set('promoName', 'kody-launch-2026-09')
	formData.set('maxAge', String(60 * 60 * 24 * 365 * 20))

	const result = (await action({
		request: makeRequest(formData),
	} as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	const cookieHeader = new Headers(result.init?.headers).get('Set-Cookie')
	expect(cookieHeader).toContain(`Max-Age=${60 * 60 * 24 * 365 * 10}`)
})

test('getPromoCookieValue reads the hidden dismiss cookie for the promo name', () => {
	const request = new Request('http://localhost/', {
		headers: { Cookie: 'kody-launch-2026-09=hidden' },
	})

	expect(
		getPromoCookieValue({
			promoName: 'kody-launch-2026-09',
			request,
		}),
	).toBe('hidden')
})

test('loader rejects get requests with method not allowed', async () => {
	const result = (await loader()) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(405)
	expect(new Headers(result.init?.headers).get('Allow')).toBe('POST')
	expect(result.data).toEqual({
		success: false,
		error: 'Method Not Allowed',
	})
})
