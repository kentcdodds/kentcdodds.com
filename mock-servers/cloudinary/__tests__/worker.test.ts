import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('cloudinary mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-cloudinary.local/__mocks/meta'),
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('cloudinary')
	})

	test('serves placeholder image responses', async () => {
		const imageResponse = await worker.fetch(
			new Request(
				'http://mock-cloudinary.local/kentcdodds-com/image/upload/w_100,q_auto,f_webp/sample',
			),
		)
		expect(imageResponse.status).toBe(200)
		expect(imageResponse.headers.get('content-type')).toBe('image/webp')
		const bodyBytes = new Uint8Array(await imageResponse.arrayBuffer())
		expect(bodyBytes.byteLength).toBeGreaterThan(0)

		const headResponse = await worker.fetch(
			new Request(
				'http://mock-cloudinary.local/kentcdodds-com/image/upload/w_100,q_auto,f_webp/sample',
				{
					method: 'HEAD',
				},
			),
		)
		expect(headResponse.status).toBe(200)
		expect(headResponse.headers.get('content-type')).toBe('image/webp')
	})
})
