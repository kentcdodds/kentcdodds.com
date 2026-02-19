import { describe, expect, test, vi } from 'vitest'
import {
	isSemanticSearchConfigured,
	semanticSearchKCD,
} from '../semantic-search.server.ts'

describe('semantic search env gating', () => {
	test('isSemanticSearchConfigured is false without env vars', () => {
		const original = {
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
			CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
			CLOUDFLARE_VECTORIZE_INDEX: process.env.CLOUDFLARE_VECTORIZE_INDEX,
		}
		try {
			delete process.env.CLOUDFLARE_ACCOUNT_ID
			delete process.env.CLOUDFLARE_API_TOKEN
			delete process.env.CLOUDFLARE_VECTORIZE_INDEX
			expect(isSemanticSearchConfigured()).toBe(false)
		} finally {
			for (const [key, value] of Object.entries(original)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}
		}
	})

	test('semanticSearchKCD throws a helpful error when unconfigured', async () => {
		const original = {
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
			CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
			CLOUDFLARE_VECTORIZE_INDEX: process.env.CLOUDFLARE_VECTORIZE_INDEX,
		}
		try {
			delete process.env.CLOUDFLARE_ACCOUNT_ID
			delete process.env.CLOUDFLARE_API_TOKEN
			delete process.env.CLOUDFLARE_VECTORIZE_INDEX
			await expect(semanticSearchKCD({ query: 'react' })).rejects.toThrow(
				/Semantic search is not configured/i,
			)
		} finally {
			for (const [key, value] of Object.entries(original)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}
		}
	})
})

describe('semantic search result normalization', () => {
	test('dedupes chunk-level matches into unique docs', async () => {
		const originalEnv = {
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
			CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
			CLOUDFLARE_VECTORIZE_INDEX: process.env.CLOUDFLARE_VECTORIZE_INDEX,
			CLOUDFLARE_AI_EMBEDDING_MODEL: process.env.CLOUDFLARE_AI_EMBEDDING_MODEL,
		}
		let vectorizeTopKRequested = 0

		try {
			process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
			process.env.CLOUDFLARE_API_TOKEN = 'test-token'
			process.env.CLOUDFLARE_VECTORIZE_INDEX = 'test-index'
			delete process.env.CLOUDFLARE_AI_EMBEDDING_MODEL

			const matches = [
				{
					id: 'blog:react-hooks-pitfalls:chunk:0',
					score: 0.99,
					metadata: {
						type: 'blog',
						slug: 'react-hooks-pitfalls',
						url: '/blog/react-hooks-pitfalls',
						title: 'React Hooks Pitfalls',
						snippet: 'snippet-0',
						chunkIndex: 0,
						chunkCount: 3,
					},
				},
				{
					id: 'blog:react-hooks-pitfalls:chunk:1',
					score: 0.98,
					metadata: {
						type: 'blog',
						slug: 'react-hooks-pitfalls',
						url: '/blog/react-hooks-pitfalls',
						title: 'React Hooks Pitfalls',
						snippet: 'snippet-1',
						chunkIndex: 1,
						chunkCount: 3,
					},
				},
				{
					id: 'credit:alice:chunk:0',
					score: 0.97,
					metadata: {
						type: 'credit',
						slug: 'alice',
						url: '/credits',
						title: 'Alice',
						snippet: 'alice-snippet',
						chunkIndex: 0,
						chunkCount: 1,
					},
				},
				{
					id: 'credit:bob:chunk:0',
					score: 0.96,
					metadata: {
						type: 'credit',
						slug: 'bob',
						url: '/credits',
						title: 'Bob',
						snippet: 'bob-snippet',
						chunkIndex: 0,
						chunkCount: 1,
					},
				},
				{
					id: 'blog:some-other-post:chunk:0',
					score: 0.95,
					metadata: {
						type: 'blog',
						slug: 'some-other-post',
						url: '/blog/some-other-post',
						title: 'Some Other Post',
						snippet: 'other-snippet',
						chunkIndex: 0,
						chunkCount: 2,
					},
				},
			]

			vi.stubGlobal(
				'fetch',
				vi.fn(async (input: any, init?: RequestInit) => {
					const url = String(input)
					if (url.includes('/ai/run/')) {
						return new Response(
							JSON.stringify({ result: { data: [[0.1, 0.2, 0.3]] } }),
							{ status: 200, headers: { 'Content-Type': 'application/json' } },
						)
					}
					if (url.includes('/vectorize/v2/indexes/') && url.endsWith('/query')) {
						const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
						vectorizeTopKRequested =
							typeof body?.topK === 'number' ? body.topK : vectorizeTopKRequested
						const requestedTopK =
							typeof body?.topK === 'number' ? body.topK : matches.length
						const sliced = matches.slice(0, requestedTopK)
						return new Response(
							JSON.stringify({ result: { count: sliced.length, matches: sliced } }),
							{ status: 200, headers: { 'Content-Type': 'application/json' } },
						)
					}
					return new Response('Not found', { status: 404 })
				}),
			)

			const results = await semanticSearchKCD({ query: 'hooks', topK: 3 })
			expect(vectorizeTopKRequested).toBeGreaterThan(3)
			expect(results).toHaveLength(3)

			// Chunk-level duplicates collapse into a single doc-level result.
			const ids = results.map((r) => r.id)
			expect(new Set(ids).size).toBe(ids.length)
			expect(ids).toContain('blog:react-hooks-pitfalls')

			const blogResult = results.find((r) => r.id === 'blog:react-hooks-pitfalls')
			expect(blogResult?.snippet).toBe('snippet-0')

			// Credits share the same URL, but should not be collapsed (slug differentiates them).
			expect(ids).toContain('credit:alice')
			expect(ids).toContain('credit:bob')
		} finally {
			for (const [key, value] of Object.entries(originalEnv)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}
			vi.unstubAllGlobals()
		}
	})
})

