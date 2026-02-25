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
				'http://mock-media-images.local/images/sample/path.png?tr=w_100,q_auto,f_webp',
			),
		)
		expect(imageResponse.status).toBe(200)
		expect(imageResponse.headers.get('content-type')).toBe('image/webp')
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

	test('serves placeholder social image responses', async () => {
		const socialResponse = await worker.fetch(
			new Request(
				'http://mock-media-images.local/social/generic.png?words=Hello&url=kentcdodds.com%2Fblog',
			),
		)
		expect(socialResponse.status).toBe(200)
		expect(socialResponse.headers.get('content-type')).toBe('image/webp')
		const bodyBytes = new Uint8Array(await socialResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)
	})
})
