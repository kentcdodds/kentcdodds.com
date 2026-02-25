import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('cloudflare-r2 mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-r2.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('cloudflare-r2')
	})

	test('supports put head get delete object flow', async () => {
		const putResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'PUT',
				headers: { 'content-type': 'audio/mpeg' },
				body: new Uint8Array([1, 2, 3, 4, 5]),
			}),
			{},
			{},
		)
		expect(putResponse.status).toBe(200)

		const headResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'HEAD',
			}),
			{},
			{},
		)
		expect(headResponse.status).toBe(200)
		expect(headResponse.headers.get('content-type')).toBe('audio/mpeg')

		const getResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3'),
			{},
			{},
		)
		expect(getResponse.status).toBe(200)
		const bytes = new Uint8Array(await getResponse.arrayBuffer())
		expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5])

		const listResponse = await worker.fetch(
			new Request(
				'http://mock-r2.local/my-bucket?list-type=2&prefix=path/to',
			),
			{},
			{},
		)
		expect(listResponse.status).toBe(200)
		const listBody = await listResponse.text()
		expect(listBody).toContain('<Key>path/to/audio.mp3</Key>')

		const deleteResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'DELETE',
			}),
			{},
			{},
		)
		expect(deleteResponse.status).toBe(204)

		const missingHeadResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'HEAD',
			}),
			{},
			{},
		)
		expect(missingHeadResponse.status).toBe(404)
	})
})
