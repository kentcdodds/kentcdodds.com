// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest'

import {
	action,
	dismissPromotification,
	getPromoCookieValue,
	loader,
} from '../promotification.tsx'

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

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

test('action rejects non-POST methods', async () => {
	const formData = new FormData()
	formData.set('promoName', 'kody-launch-2026-09')

	const result = (await action({
		request: new Request('http://localhost/resources/promotification', {
			method: 'PUT',
			body: formData,
		}),
	} as any)) as {
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

test('dismissPromotification posts promoName and maxAge', async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(null, { status: 200 }))
	vi.stubGlobal('fetch', fetchMock)

	const result = await dismissPromotification({
		promoName: 'kody-launch-2026-09',
		maxAge: 86400,
	})

	expect(result).toEqual({ success: true })
	expect(fetchMock).toHaveBeenCalledOnce()
	expect(fetchMock.mock.calls[0]?.[0]).toBe('/resources/promotification')
	expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
	const body = fetchMock.mock.calls[0]?.[1]?.body
	expect(body).toBeInstanceOf(URLSearchParams)
	expect(String(body)).toBe('promoName=kody-launch-2026-09&maxAge=86400')
})

test('dismissPromotification swallows network TypeErrors (KCD-10H)', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
	)

	await expect(
		dismissPromotification({
			promoName: 'kody-launch-2026-09',
			maxAge: 86400,
		}),
	).resolves.toBeUndefined()
})

test('dismissPromotification returns action error bodies without throwing', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({ success: false, error: 'Invalid promoName' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			),
		),
	)

	await expect(
		dismissPromotification({
			promoName: 'bad name',
			maxAge: 86400,
		}),
	).resolves.toEqual({ success: false, error: 'Invalid promoName' })
})
