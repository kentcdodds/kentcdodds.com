import { describe, expect, test } from 'vitest'
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
				'http://mock-media-images.local/kentcdodds-com/image/upload/w_100,q_auto,f_webp/sample',
			),
		)
		expect(imageResponse.status).toBe(200)
		expect(imageResponse.headers.get('content-type')).toBe('image/webp')
		const bodyBytes = new Uint8Array(await imageResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)

		const headResponse = await worker.fetch(
			new Request(
				'http://mock-media-images.local/kentcdodds-com/image/upload/w_100,q_auto,f_webp/sample',
				{
					method: 'HEAD',
				},
			),
		)
		expect(headResponse.status).toBe(200)
		expect(headResponse.headers.get('content-type')).toBe('image/webp')
	})

	test('serves placeholder stream responses', async () => {
		const videoResponse = await worker.fetch(
			new Request('http://mock-media-images.local/stream/sample-video.mp4'),
		)
		expect(videoResponse.status).toBe(200)
		expect(videoResponse.headers.get('content-type')).toBe('video/mp4')
		const bodyBytes = new Uint8Array(await videoResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)
	})

	test('serves placeholder call artwork responses', async () => {
		const artworkResponse = await worker.fetch(
			new Request(
				'http://mock-media-images.local/artwork/call-kent.png?title=Hello&url=kentcdodds.com%2Fcalls%2F01%2F01',
			),
		)
		expect(artworkResponse.status).toBe(200)
		expect(artworkResponse.headers.get('content-type')).toBe('image/webp')
		const bodyBytes = new Uint8Array(await artworkResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)
	})
})
