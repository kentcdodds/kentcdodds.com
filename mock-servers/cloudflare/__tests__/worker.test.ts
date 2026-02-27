import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('cloudflare mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-cloudflare.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('cloudflare')
	})

	test('supports workers-ai embedding and vectorize query flow', async () => {
		const embeddingResponse = await worker.fetch(
			new Request(
				'http://mock-cloudflare.local/gateway/v1/acc-1/gateway-1/workers-ai/@cf/google/embeddinggemma-300m',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ text: ['hello semantic search'] }),
				},
			),
			{},
			{},
		)
		expect(embeddingResponse.status).toBe(200)
		const embeddingPayload = (await embeddingResponse.json()) as {
			result?: { data?: number[][] }
		}
		const vector = embeddingPayload.result?.data?.[0]
		expect(Array.isArray(vector)).toBe(true)

		const upsertNdjson = `${JSON.stringify({
			id: 'doc-1',
			values: vector,
			metadata: {
				type: 'blog',
				title: 'Hello semantic search',
				url: '/blog/hello',
				snippet: 'First blog doc',
			},
		})}\n`

		const upsertResponse = await worker.fetch(
			new Request(
				'http://mock-cloudflare.local/client/v4/accounts/acc-1/vectorize/v2/indexes/semantic/upsert',
				{
					method: 'POST',
					headers: { 'content-type': 'application/x-ndjson' },
					body: upsertNdjson,
				},
			),
			{},
			{},
		)
		expect(upsertResponse.status).toBe(200)

		const queryResponse = await worker.fetch(
			new Request(
				'http://mock-cloudflare.local/client/v4/accounts/acc-1/vectorize/v2/indexes/semantic/query',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ vector, topK: 5 }),
				},
			),
			{},
			{},
		)
		expect(queryResponse.status).toBe(200)
		const queryPayload = (await queryResponse.json()) as {
			result?: {
				matches?: Array<{ id: string; metadata?: { title?: string } }>
			}
		}
		expect(queryPayload.result?.matches?.[0]?.id).toBe('doc-1')
		expect(queryPayload.result?.matches?.[0]?.metadata?.title).toBe(
			'Hello semantic search',
		)
	})
})
