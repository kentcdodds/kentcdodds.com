import { describe, expect, test, vi } from 'vitest'
import worker from '../worker.ts'

describe('media images mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-media-images.local/__mocks/meta'),
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('media-images')
	})

	test('serves placeholder image responses', async () => {
		const imageResponse = await worker.fetch(
			new Request(
				'http://mock-media-images.local/images/sample/path.png?tr=w_100,q_auto,f_webp',
			),
		)
		expect(imageResponse.status).toBe(200)
		expect(imageResponse.headers.get('content-type')).toBe('image/svg+xml')
		expect(imageResponse.headers.get('access-control-allow-origin')).toBe('*')
		const bodyBytes = new Uint8Array(await imageResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)

		const headResponse = await worker.fetch(
			new Request(
				'http://mock-media-images.local/images/sample/path.png?tr=w_100,q_auto,f_webp',
				{
					method: 'HEAD',
				},
			),
		)
		expect(headResponse.status).toBe(200)
		expect(headResponse.headers.get('content-type')).toBe('image/svg+xml')
		expect(headResponse.headers.get('access-control-allow-origin')).toBe('*')
	})

	test('serves placeholder stream responses', async () => {
		const videoResponse = await worker.fetch(
			new Request('http://mock-media-images.local/stream/sample-video.mp4'),
		)
		expect(videoResponse.status).toBe(200)
		expect(videoResponse.headers.get('content-type')).toBe('image/svg+xml')
		const bodyBytes = new Uint8Array(await videoResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)
	})

	test('serves repo media files from assets binding when available', async () => {
		const assetsFetch = vi.fn(async (request: Request) => {
			const path = new URL(request.url).pathname
			if (path === '/blog/demo/image.png') {
				return new Response(new Uint8Array([1, 2, 3]), {
					headers: { 'content-type': 'image/png' },
				})
			}
			if (path === '/blog/demo/video.webm') {
				return new Response(new Uint8Array([4, 5, 6]), {
					headers: { 'content-type': 'video/webm' },
				})
			}
			return new Response('not found', { status: 404 })
		})

		const imageResponse = await worker.fetch(
			new Request('http://mock-media-images.local/images/blog/demo/image.png'),
			{
				ASSETS: { fetch: assetsFetch },
			},
		)
		expect(imageResponse.status).toBe(200)
		expect(imageResponse.headers.get('content-type')).toBe('image/png')
		expect(imageResponse.headers.get('access-control-allow-origin')).toBe('*')
		expect(assetsFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: 'http://mock-media-images.local/blog/demo/image.png',
			}),
		)

		const videoResponse = await worker.fetch(
			new Request('http://mock-media-images.local/stream/blog/demo/video.webm'),
			{
				ASSETS: { fetch: assetsFetch },
			},
		)
		expect(videoResponse.status).toBe(200)
		expect(videoResponse.headers.get('content-type')).toBe('video/webm')
	})

	test('proxies media requests when proxy base url is configured', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			async (request: Request | URL | string) => {
				const normalizedRequest =
					request instanceof Request ? request : new Request(String(request))
				const requestUrl = new URL(normalizedRequest.url)
				if (requestUrl.origin === 'https://cache-miss.test') {
					return new Response('not found', { status: 404 })
				}
				return new Response(new Uint8Array([9, 8, 7]), {
					status: 200,
					headers: { 'content-type': 'image/png' },
				})
			},
		)
		try {
			const response = await worker.fetch(
				new Request('http://mock-media-images.local/images/blog/demo/image.png'),
				{
					MEDIA_PROXY_BASE_URL: 'https://example-media-proxy.test',
					MEDIA_PROXY_CACHE_BASE_URL: 'https://cache-miss.test',
				},
			)
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe('image/png')
			expect(response.headers.get('access-control-allow-origin')).toBe('*')
			const requestUrls = fetchSpy.mock.calls
				.map((call) => call[0])
				.filter((value): value is Request => value instanceof Request)
				.map((request) => request.url)
			expect(requestUrls).toContain(
				'https://example-media-proxy.test/images/blog/demo/image.png',
			)
		} finally {
			fetchSpy.mockRestore()
		}
	})

	test('falls back to direct Cloudflare Images delivery when proxy host fails', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			async (request: Request | URL | string) => {
				const normalizedRequest =
					request instanceof Request ? request : new Request(String(request))
				const requestUrl = new URL(normalizedRequest.url)
				if (requestUrl.origin === 'https://cache-miss.test') {
					return new Response('not found', { status: 404 })
				}
				if (requestUrl.origin === 'https://example-media-proxy.test') {
					throw new Error('proxy unreachable')
				}
				if (requestUrl.origin === 'https://imagedelivery.net') {
					return new Response(new Uint8Array([3, 2, 1]), {
						status: 200,
						headers: { 'content-type': 'image/png' },
					})
				}
				throw new Error(`Unexpected fetch URL: ${requestUrl.toString()}`)
			},
		)
		try {
			const response = await worker.fetch(
				new Request(
					'http://mock-media-images.local/images/6f98f046-4cbd-41ea-6834-a31dc62da900',
				),
				{
					MEDIA_PROXY_BASE_URL: 'https://example-media-proxy.test',
					MEDIA_PROXY_CACHE_BASE_URL: 'https://cache-miss.test',
				},
			)
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe('image/png')
			expect(response.headers.get('access-control-allow-origin')).toBe('*')
			const requestUrls = fetchSpy.mock.calls
				.map((call) => call[0])
				.filter((value): value is Request => value instanceof Request)
				.map((request) => request.url)
			expect(requestUrls).toContain(
				'https://imagedelivery.net/-P7RfnLm6GMsEkkSxgg7ZQ/6f98f046-4cbd-41ea-6834-a31dc62da900/public',
			)
			expect(requestUrls).not.toContain(
				'https://example-media-proxy.test/images/6f98f046-4cbd-41ea-6834-a31dc62da900',
			)
		} finally {
			fetchSpy.mockRestore()
		}
	})

	test('uses direct Cloudflare delivery when proxy base url is absent', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			async (request: Request | URL | string) => {
				const normalizedRequest =
					request instanceof Request ? request : new Request(String(request))
				const requestUrl = new URL(normalizedRequest.url)
				if (requestUrl.origin === 'https://cache-miss.test') {
					return new Response('not found', { status: 404 })
				}
				if (requestUrl.origin === 'https://imagedelivery.net') {
					return new Response(new Uint8Array([5, 4, 3]), {
						status: 200,
						headers: { 'content-type': 'image/png' },
					})
				}
				throw new Error(`Unexpected fetch URL: ${requestUrl.toString()}`)
			},
		)
		try {
			const response = await worker.fetch(
				new Request(
					'http://mock-media-images.local/images/6f98f046-4cbd-41ea-6834-a31dc62da900',
				),
				{
					MEDIA_PROXY_CACHE_BASE_URL: 'https://cache-miss.test',
				},
			)
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe('image/png')
			expect(response.headers.get('access-control-allow-origin')).toBe('*')
			const requestUrls = fetchSpy.mock.calls
				.map((call) => call[0])
				.filter((value): value is Request => value instanceof Request)
				.map((request) => request.url)
			expect(requestUrls).toContain(
				'https://imagedelivery.net/-P7RfnLm6GMsEkkSxgg7ZQ/6f98f046-4cbd-41ea-6834-a31dc62da900/public',
			)
		} finally {
			fetchSpy.mockRestore()
		}
	})

	test('caches proxied media and serves cached asset when remote is unavailable', async () => {
		const cacheStore = new Map<string, Uint8Array>()
		let remoteOnline = true
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			async (request: Request | URL | string) => {
				const normalizedRequest =
					request instanceof Request ? request : new Request(String(request))
				const requestUrl = new URL(normalizedRequest.url)

				if (requestUrl.origin === 'https://cache-media.test') {
					if (normalizedRequest.method === 'PUT') {
						const payload = new Uint8Array(await normalizedRequest.arrayBuffer())
						cacheStore.set(requestUrl.pathname, payload)
						return new Response(null, { status: 200 })
					}
					const cachedPayload = cacheStore.get(requestUrl.pathname)
					if (!cachedPayload) {
						return new Response('not found', { status: 404 })
					}
					return new Response(new Uint8Array(cachedPayload), {
						status: 200,
						headers: { 'content-type': 'image/png' },
					})
				}

				if (requestUrl.origin === 'https://remote-media.test') {
					if (!remoteOnline) {
						throw new Error('remote offline')
					}
					return new Response(new Uint8Array([9, 8, 7]), {
						status: 200,
						headers: { 'content-type': 'image/png' },
					})
				}

				throw new Error(`Unexpected fetch URL: ${requestUrl.toString()}`)
			},
		)
		try {
			const env = {
				MEDIA_PROXY_BASE_URL: 'https://remote-media.test',
				MEDIA_PROXY_CACHE_BASE_URL: 'https://cache-media.test',
			}
			const firstResponse = await worker.fetch(
				new Request(
					'http://mock-media-images.local/images/blog/demo/image.png?tr=w_120,q_auto',
				),
				env,
			)
			expect(firstResponse.status).toBe(200)
			expect(new Uint8Array(await firstResponse.arrayBuffer())).toEqual(
				new Uint8Array([9, 8, 7]),
			)

			remoteOnline = false

			const secondResponse = await worker.fetch(
				new Request(
					'http://mock-media-images.local/images/blog/demo/image.png?tr=w_120,q_auto',
				),
				env,
			)
			expect(secondResponse.status).toBe(200)
			expect(new Uint8Array(await secondResponse.arrayBuffer())).toEqual(
				new Uint8Array([9, 8, 7]),
			)

			const requestedUrls = fetchSpy.mock.calls.map((call) => {
				const request = call[0]
				return request instanceof Request
					? request.url
					: request instanceof URL
						? request.toString()
						: String(request)
			})
			expect(
				requestedUrls.some((url) => url.startsWith('https://remote-media.test/')),
			).toBe(true)
			expect(
				requestedUrls.some((url) => url.startsWith('https://cache-media.test/')),
			).toBe(true)
			expect(cacheStore.size).toBeGreaterThan(0)
		} finally {
			fetchSpy.mockRestore()
		}
	})

	test('serves placeholder call artwork responses', async () => {
		const artworkResponse = await worker.fetch(
			new Request(
				'http://mock-media-images.local/artwork/call-kent.png?title=Hello&url=kentcdodds.com%2Fcalls%2F01%2F01',
			),
		)
		expect(artworkResponse.status).toBe(200)
		expect(artworkResponse.headers.get('content-type')).toBe('image/svg+xml')
		const bodyBytes = new Uint8Array(await artworkResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)
	})

	test('serves placeholder social image responses', async () => {
		const socialResponse = await worker.fetch(
			new Request(
				'http://mock-media-images.local/social/generic.png?words=Hello&url=kentcdodds.com%2Fblog',
			),
		)
		expect(socialResponse.status).toBe(200)
		expect(socialResponse.headers.get('content-type')).toBe('image/svg+xml')
		const bodyBytes = new Uint8Array(await socialResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)
	})
})
