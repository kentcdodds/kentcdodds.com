import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('transistor mock worker', () => {
	test('returns metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-transistor.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('transistor')
	})

	test('supports authorize upload + create + publish + list', async () => {
		const authorizeResponse = await worker.fetch(
			new Request(
				'http://mock-transistor.local/v1/episodes/authorize_upload?filename=test.mp3',
			),
			{},
			{},
		)
		expect(authorizeResponse.status).toBe(200)
		const authorizePayload = (await authorizeResponse.json()) as {
			data: {
				attributes: {
					upload_url: string
					audio_url: string
					content_type: string
				}
			}
		}
		expect(authorizePayload.data.attributes.upload_url).toContain('/uploads/')

		const uploadResponse = await worker.fetch(
			new Request(authorizePayload.data.attributes.upload_url, {
				method: 'PUT',
				body: new Uint8Array([1, 2, 3]),
				headers: {
					'content-type': authorizePayload.data.attributes.content_type,
				},
			}),
			{},
			{},
		)
		expect(uploadResponse.status).toBe(200)

		const createResponse = await worker.fetch(
			new Request('http://mock-transistor.local/v1/episodes', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					episode: {
						show_id: 'mock-show',
						season: 3,
						audio_url: authorizePayload.data.attributes.audio_url,
						title: 'New Mock Episode',
						summary: 'summary',
						description: 'description',
						keywords: 'mock,episode',
					},
				}),
			}),
			{},
			{},
		)
		expect(createResponse.status).toBe(201)
		const createdPayload = (await createResponse.json()) as {
			data: { id: string; attributes: { status: string; season: number } }
		}
		expect(createdPayload.data.attributes.season).toBe(3)
		expect(createdPayload.data.attributes.status).toBe('draft')

		const publishResponse = await worker.fetch(
			new Request(
				`http://mock-transistor.local/v1/episodes/${createdPayload.data.id}/publish`,
				{
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ episode: { status: 'published' } }),
				},
			),
			{},
			{},
		)
		expect(publishResponse.status).toBe(200)

		const listResponse = await worker.fetch(
			new Request(
				'http://mock-transistor.local/v1/episodes?pagination[per]=2&pagination[page]=1&order=desc',
			),
			{},
			{},
		)
		expect(listResponse.status).toBe(200)
		const listPayload = (await listResponse.json()) as {
			data: Array<{ id: string }>
			meta: { currentPage: number; totalPages: number; totalCount: number }
		}
		expect(listPayload.data).toHaveLength(2)
		expect(listPayload.meta.currentPage).toBe(1)
		expect(listPayload.meta.totalPages).toBeGreaterThanOrEqual(1)
		expect(listPayload.meta.totalCount).toBeGreaterThan(2)
	})
})
