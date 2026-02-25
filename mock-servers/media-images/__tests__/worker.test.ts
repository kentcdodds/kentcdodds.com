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

	test('proxies media requests to r2 when proxy base url is configured', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(new Uint8Array([9, 8, 7]), {
				status: 200,
				headers: { 'content-type': 'image/png' },
			}),
		)
		try {
			const response = await worker.fetch(
				new Request('http://mock-media-images.local/images/blog/demo/image.png'),
				{
					MEDIA_R2_PROXY_BASE_URL: 'https://example-r2-proxy.test',
				},
			)
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toBe('image/png')
			expect(fetchSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: 'https://example-r2-proxy.test/blog/demo/image.png',
				}),
			)
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
