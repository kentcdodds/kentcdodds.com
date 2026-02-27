import { afterEach, describe, expect, it, vi } from 'vitest'

import { maybeHandleMediaProxyRequest } from '../media-proxy.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe('maybeHandleMediaProxyRequest', () => {
	it('falls back to media base url for unmapped image ids', async () => {
		const fetchSpy = vi.fn((input: RequestInfo | URL) => {
			const request = input instanceof Request ? input : new Request(input)
			const url = new URL(request.url)
			if (url.hostname === 'imagedelivery.net') {
				return Promise.resolve(new Response('not found', { status: 404 }))
			}
			expect(url.toString()).toBe(
				'https://media.kcd.dev/images/legacy/path/image-no-id?tr=f_auto%2Cq_auto%2Cw_900',
			)
			return Promise.resolve(
				new Response('ok', {
					status: 200,
					headers: { 'content-type': 'image/jpeg' },
				}),
			)
		})
		globalThis.fetch = fetchSpy as unknown as typeof fetch

		const response = await maybeHandleMediaProxyRequest(
			new Request(
				'https://preview.example.com/images/legacy/path/image-no-id?tr=f_auto%2Cq_auto%2Cw_900',
			),
			{},
		)

		expect(response).not.toBeNull()
		expect(response?.status).toBe(200)
		expect(fetchSpy.mock.calls).toHaveLength(3)
	})

	it('fetches unsplash images directly through Cloudflare transforms', async () => {
		const fetchSpy = vi.fn((input: RequestInfo | URL) => {
			const request = input instanceof Request ? input : new Request(input)
			const url = new URL(request.url)
			expect(url.toString()).toBe(
				'https://images.unsplash.com/photo-1494088644719-c75cad020cff',
			)
			return Promise.resolve(new Response('ok', { status: 200 }))
		})
		globalThis.fetch = fetchSpy as unknown as typeof fetch

		const response = await maybeHandleMediaProxyRequest(
			new Request(
				'https://preview.example.com/images/unsplash/photo-1494088644719-c75cad020cff?tr=f_auto%2Cq_auto%2Cw_900',
			),
			{},
		)

		expect(response?.status).toBe(200)
		expect(fetchSpy.mock.calls).toHaveLength(1)
	})

	it('derives missing dimensions from ar transform values', async () => {
		let transformedRequestInit: RequestInit | undefined
		const fetchSpy = vi.fn(
			(input: RequestInfo | URL, init?: RequestInit) => {
				const request = input instanceof Request ? input : new Request(input)
				const url = new URL(request.url)
				if (url.hostname === 'imagedelivery.net') {
					transformedRequestInit ??= init
					return Promise.resolve(new Response('ok', { status: 200 }))
				}
				return Promise.resolve(new Response('unexpected', { status: 500 }))
			},
		)
		globalThis.fetch = fetchSpy as unknown as typeof fetch

		const response = await maybeHandleMediaProxyRequest(
			new Request(
				'https://preview.example.com/images/kent/profile-transparent?tr=f_auto%2Cq_auto%2Cc_pad%2Cw_80%2Car_1:1',
			),
			{},
		)

		expect(response?.status).toBe(200)
		expect(transformedRequestInit).toBeDefined()
		expect(
			(
				transformedRequestInit as RequestInit & {
					cf?: { image?: Record<string, unknown> }
				}
			).cf?.image,
		).toMatchObject({
			width: 80,
			height: 80,
			fit: 'pad',
		})
	})
})
