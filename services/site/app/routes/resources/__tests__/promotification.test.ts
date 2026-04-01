// @vitest-environment node
import { expect, test } from 'vitest'

import { action } from '../promotification.tsx'

function makeRequest(formData: FormData) {
	return new Request('http://localhost/resources/promotification', {
		method: 'POST',
		body: formData,
	})
}

test('action stores a hidden cookie for a valid promo name', async () => {
	const formData = new FormData()
	formData.set('promoName', 'chats-with-kent-season-7')
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
	expect(cookieHeader).toContain('chats-with-kent-season-7=hidden')
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
	formData.set('promoName', 'chats-with-kent-season-7')
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
