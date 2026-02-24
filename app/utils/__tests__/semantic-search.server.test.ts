import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import {
	cloudflareHandlers,
	resetCloudflareMockState,
} from '../../../mocks/cloudflare.ts'
import { semanticSearchKCD } from '../semantic-search.server.ts'

const server = setupServer(...cloudflareHandlers)

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
	resetCloudflareMockState()
})

afterAll(() => {
	server.close()
})

describe('semantic search result normalization', () => {
	test('dedupes chunk-level matches into unique docs', async () => {
		const originalEnv = {
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
			CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
			CLOUDFLARE_AI_GATEWAY_ID: process.env.CLOUDFLARE_AI_GATEWAY_ID,
			CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN:
				process.env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN,
			CLOUDFLARE_VECTORIZE_INDEX: process.env.CLOUDFLARE_VECTORIZE_INDEX,
			CLOUDFLARE_AI_EMBEDDING_MODEL: process.env.CLOUDFLARE_AI_EMBEDDING_MODEL,
			CLOUDFLARE_AI_TEXT_MODEL: process.env.CLOUDFLARE_AI_TEXT_MODEL,
		}
		try {
			const accountId = 'acc123'
			const apiToken = 'MOCK_test-token'
			const indexName = 'semantic-index'
			const gatewayId = 'test-gateway'
			const gatewayAuthToken = 'MOCK_test-gateway-auth-token'

			process.env.CLOUDFLARE_ACCOUNT_ID = accountId
			process.env.CLOUDFLARE_API_TOKEN = apiToken
			process.env.CLOUDFLARE_AI_GATEWAY_ID = gatewayId
			process.env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN = gatewayAuthToken
			process.env.CLOUDFLARE_VECTORIZE_INDEX = indexName
			process.env.CLOUDFLARE_AI_TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct'
			delete process.env.CLOUDFLARE_AI_EMBEDDING_MODEL

			// Use a query that's unlikely to match any seeded doc titles/snippets,
			// so the Cloudflare Vectorize mock falls back to cosine similarity rather
			// than match-sorter ranking.
			const query = 'zz_semantic_dedupe_test_02157475'

			const embedRes = await fetch(
				`https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/workers-ai/@cf/google/embeddinggemma-300m`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiToken}`,
						'cf-aig-authorization': `Bearer ${gatewayAuthToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ text: [query] }),
				},
			)
			expect(embedRes.ok).toBe(true)
			const embedJson = (await embedRes.json()) as any
			const vector = embedJson?.result?.data?.[0] as unknown
			expect(Array.isArray(vector)).toBe(true)

			const vectorsToUpsert = [
				{
					id: 'blog:cursor-dup:chunk:0',
					values: vector as number[],
					metadata: {
						type: 'blog',
						slug: 'cursor-dup',
						url: '/blog/cursor-dup',
						title: 'Cursor Dup',
						snippet: 'snippet-best',
						imageUrl: 'https://example.com/cursor-dup.png',
						imageAlt: 'Cursor Dup',
					},
				},
				{
					id: 'blog:cursor-dup:chunk:1',
					values: vector as number[],
					metadata: {
						type: 'blog',
						slug: 'cursor-dup',
						url: '/blog/cursor-dup',
						title: 'Cursor Dup (chunk 2)',
						snippet: 'snippet-worse',
					},
				},
				{
					id: 'blog:cursor-one:chunk:0',
					values: vector as number[],
					metadata: {
						type: 'blog',
						slug: 'cursor-one',
						url: '/blog/cursor-one',
						title: 'Cursor One',
						snippet: 'one-snippet',
					},
				},
				{
					id: 'credit:alice:chunk:0',
					values: vector as number[],
					metadata: {
						type: 'credit',
						slug: 'alice',
						url: '/credits',
						title: 'Alice',
						snippet: 'alice-snippet',
					},
				},
				{
					id: 'credit:bob:chunk:0',
					values: vector as number[],
					metadata: {
						type: 'credit',
						slug: 'bob',
						url: '/credits',
						title: 'Bob',
						snippet: 'bob-snippet',
					},
				},
				{
					id: 'youtube:dQw4w9WgXcQ:chunk:0',
					values: vector as number[],
					metadata: {
						type: 'youtube',
						slug: 'dQw4w9WgXcQ',
						url: '/youtube?video=dQw4w9WgXcQ',
						title: 'Never Gonna Give You Up',
						snippet: 'never gonna give you up',
						startSeconds: 123,
					},
				},
			]

			const ndjson =
				vectorsToUpsert.map((v) => JSON.stringify(v)).join('\n') + '\n'
			const upsertRes = await fetch(
				`https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/upsert`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiToken}`,
						'Content-Type': 'application/x-ndjson',
					},
					body: ndjson,
				},
			)
			expect(upsertRes.ok).toBe(true)

			const results = await semanticSearchKCD({ query, topK: 5 })
			expect(results).toHaveLength(5)

			// Chunk-level duplicates collapse into a single doc-level result.
			const ids = results.map((r) => r.id)
			const urls = results.map((r) => r.url)
			expect(new Set(ids).size).toBe(ids.length)
			expect(urls.filter((u) => u === '/blog/cursor-dup')).toHaveLength(1)

			const blogResult = results.find((r) => r.url === '/blog/cursor-dup')
			expect(blogResult).toBeDefined()
			expect(blogResult!.snippet).toBe('snippet-best')
			expect(blogResult!.imageUrl).toBe('https://example.com/cursor-dup.png')
			expect(blogResult!.imageAlt).toBe('Cursor Dup')

			// Credits share the same URL, but should not be collapsed (slug differentiates them).
			expect(ids).toContain('credit:alice')
			expect(ids).toContain('credit:bob')
			expect(urls.filter((u) => u === '/credits')).toHaveLength(2)

			const youtubeResult = results.find((r) => r.type === 'youtube')
			expect(youtubeResult).toBeDefined()
			expect(youtubeResult!.timestampSeconds).toBe(123)
			expect(youtubeResult!.url).toContain('/youtube')
			expect(youtubeResult!.url).toContain('t=123')
		} finally {
			for (const [key, value] of Object.entries(originalEnv)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}
		}
	})
})
