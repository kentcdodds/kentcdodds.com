import { expect, test, vi } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'

vi.mock('#app/utils/cache.server.ts', () => ({
	cache: {
		name: 'test-cache',
		get: () => null,
		set: async () => {},
		delete: async () => {},
	},
	cachified: async ({
		getFreshValue,
	}: {
		getFreshValue: () => Promise<unknown>
	}) => getFreshValue(),
}))

vi.mock('#app/utils/semantic-search-presentation.server.ts', () => ({
	getSemanticSearchPresentation: async () => ({}),
}))

import { semanticSearchKCD } from '../semantic-search.server.ts'

test('semanticSearchKCD routes user query embeddings through CLOUDFLARE_AI_GATEWAY_ID', async () => {
	using ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_API_TOKEN: 'cf-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-search-gateway',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'indexing-only-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'vector-index',
	})

	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = input instanceof Request ? input.url : String(input)

		if (url.includes('/workers-ai/')) {
			return new Response(
				JSON.stringify({
					result: {
						shape: [1, 3],
						data: [[0.1, 0.2, 0.3]],
					},
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		if (url.includes('/vectorize/')) {
			return new Response(JSON.stringify({ result: { count: 0, matches: [] } }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		throw new Error(`Unexpected fetch URL in semantic search test: ${url}`)
	})

	try {
		await semanticSearchKCD({
			query: `Gateway regression test ${Date.now()}`,
			topK: 1,
		})

		const embeddingRequestUrl = fetchSpy.mock.calls
			.map(([input]) => (input instanceof Request ? input.url : String(input)))
			.find((url) => url.includes('/workers-ai/'))

		expect(embeddingRequestUrl).toBeDefined()
		expect(embeddingRequestUrl).toContain('/runtime-search-gateway/')
		expect(embeddingRequestUrl).not.toContain('/indexing-only-gateway/')
	} finally {
		fetchSpy.mockRestore()
	}
})

test('semanticSearchKCD filters low-signal YouTube cue chunks', async () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = input instanceof Request ? input.url : String(input)

		if (url.includes('/workers-ai/')) {
			return new Response(
				JSON.stringify({
					result: {
						shape: [1, 3],
						data: [[0.1, 0.2, 0.3]],
					},
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		if (url.includes('/vectorize/')) {
			return new Response(
				JSON.stringify({
					result: {
						count: 2,
						matches: [
							{
								id: 'youtube:NtJgclB-Ig8:chunk:10',
								score: 0.98,
								metadata: {
									type: 'youtube',
									slug: 'NtJgclB-Ig8',
									title: "Infoshare 2022 - Kent C. Dodds - The Web's Next Transformation",
									url: '/youtube?video=NtJgclB-Ig8',
									snippet: '[Music]',
									chunkKind: 'transcript',
									startSeconds: 1838,
								},
							},
							{
								id: 'blog:tools-without-config:chunk:2',
								score: 0.75,
								metadata: {
									type: 'blog',
									slug: 'tools-without-config',
									title: 'Tools without config',
									url: '/blog/tools-without-config',
									snippet:
										'You can choose tools that work with little to no config.',
								},
							},
						],
					},
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		throw new Error(`Unexpected fetch URL in semantic search test: ${url}`)
	})

	try {
		const results = await semanticSearchKCD({
			query: 'config',
			topK: 5,
		})

		expect(results).toHaveLength(1)
		expect(results[0]?.type).toBe('blog')
		expect(results[0]?.title).toBe('Tools without config')
	} finally {
		fetchSpy.mockRestore()
	}
})

test('semanticSearchKCD keeps meaningful YouTube transcript chunks', async () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = input instanceof Request ? input.url : String(input)

		if (url.includes('/workers-ai/')) {
			return new Response(
				JSON.stringify({
					result: {
						shape: [1, 3],
						data: [[0.1, 0.2, 0.3]],
					},
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		if (url.includes('/vectorize/')) {
			return new Response(
				JSON.stringify({
					result: {
						count: 2,
						matches: [
							{
								id: 'youtube:Ax9iVzTTpSM:chunk:5',
								score: 0.96,
								metadata: {
									type: 'youtube',
									slug: 'Ax9iVzTTpSM',
									title: 'Remix Utah Meetup',
									url: '/youtube?video=Ax9iVzTTpSM',
									snippet: 'Remix makes progressive enhancement easier.',
									chunkKind: 'transcript',
									startSeconds: 1520,
								},
							},
							{
								id: 'blog:the-beginner-s-guide-to-remix:chunk:0',
								score: 0.82,
								metadata: {
									type: 'blog',
									slug: 'the-beginner-s-guide-to-remix',
									title: "The Beginner's Guide to Remix",
									url: '/blog/the-beginner-s-guide-to-remix',
									snippet: 'A practical intro to Remix fundamentals.',
								},
							},
						],
					},
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		throw new Error(`Unexpected fetch URL in semantic search test: ${url}`)
	})

	try {
		const results = await semanticSearchKCD({
			query: 'remix',
			topK: 5,
		})

		expect(results[0]?.type).toBe('youtube')
		expect(results[0]?.slug).toBe('Ax9iVzTTpSM')
	} finally {
		fetchSpy.mockRestore()
	}
})

test('semanticSearchKCD canonicalizes YouTube results by video id from URL when slug is missing', async () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = input instanceof Request ? input.url : String(input)

		if (url.includes('/workers-ai/')) {
			return new Response(
				JSON.stringify({
					result: {
						shape: [1, 3],
						data: [[0.1, 0.2, 0.3]],
					},
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		if (url.includes('/vectorize/')) {
			return new Response(
				JSON.stringify({
					result: {
						count: 2,
						matches: [
							{
								id: 'legacy-vector-a',
								score: 0.9,
								metadata: {
									type: 'youtube',
									title: 'Legacy video A',
									url: '/youtube?video=AAA111BBB22',
									snippet: 'First transcript chunk',
									chunkKind: 'transcript',
								},
							},
							{
								id: 'legacy-vector-b',
								score: 0.8,
								metadata: {
									type: 'youtube',
									title: 'Legacy video B',
									url: '/youtube?video=CCC333DDD44',
									snippet: 'Second transcript chunk',
									chunkKind: 'transcript',
								},
							},
						],
					},
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		throw new Error(`Unexpected fetch URL in semantic search test: ${url}`)
	})

	try {
		const results = await semanticSearchKCD({
			query: 'legacy youtube',
			topK: 5,
		})

		expect(results).toHaveLength(2)
		expect(results.map((r) => r.id)).toEqual([
			'youtube:aaa111bbb22',
			'youtube:ccc333ddd44',
		])
	} finally {
		fetchSpy.mockRestore()
	}
})
