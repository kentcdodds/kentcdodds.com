import { expect, test, vi } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'

const {
	queryLexicalSearchMatchesMock,
	getLatestCachifiedKey,
	setLatestCachifiedKey,
} = vi.hoisted(() => {
	let latestCachifiedKey: string | null = null
	return {
		queryLexicalSearchMatchesMock: vi.fn<
			(args: { query: string; topK: number }) => Promise<Array<Record<string, unknown>>>
		>(async () => []),
		getLatestCachifiedKey: () => latestCachifiedKey,
		setLatestCachifiedKey: (key: string | null) => {
			latestCachifiedKey = key
		},
	}
})

vi.mock('#app/utils/cache.server.ts', () => ({
	cache: {
		name: 'test-cache',
		get: () => null,
		set: async () => {},
		delete: async () => {},
	},
	cachified: async ({
		key,
		getFreshValue,
	}: {
		key: string
		getFreshValue: () => Promise<unknown>
	}) => {
		setLatestCachifiedKey(key)
		return getFreshValue()
	},
}))

vi.mock('#app/utils/semantic-search-presentation.server.ts', () => ({
	getSemanticSearchPresentation: async () => ({}),
}))

vi.mock('#app/utils/lexical-search-client.server.ts', () => ({
	queryLexicalSearchMatches: queryLexicalSearchMatchesMock,
}))

import { semanticSearchKCD } from '../semantic-search.server.ts'

test('semanticSearchKCD routes user query embeddings through CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID', async () => {
	queryLexicalSearchMatchesMock.mockReset()
	setLatestCachifiedKey(null)
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_API_TOKEN: 'cf-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-search-gateway',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'indexing-only-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'vector-index',
	})

	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
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
					JSON.stringify({ result: { count: 0, matches: [] } }),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					},
				)
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
		expect(embeddingRequestUrl).toContain('/indexing-only-gateway/')
		expect(embeddingRequestUrl).not.toContain('/runtime-search-gateway/')
		expect(getLatestCachifiedKey()).toContain('semantic-search:kcd:v2:')
	} finally {
		fetchSpy.mockRestore()
	}
})

test('semanticSearchKCD canonicalizes YouTube results by video id from URL when slug is missing', async () => {
	queryLexicalSearchMatchesMock.mockReset()
	setLatestCachifiedKey(null)
	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'mock-account',
		CLOUDFLARE_API_TOKEN: 'mock-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-search-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'mock-gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'mock-index',
	})

	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
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

test('semanticSearchKCD fuses lexical matches with semantic matches', async () => {
	queryLexicalSearchMatchesMock.mockReset()
	setLatestCachifiedKey(null)
	queryLexicalSearchMatchesMock.mockResolvedValue([
		{
			id: 'blog:react-hooks-pitfalls:chunk:0',
			type: 'blog',
			slug: 'react-hooks-pitfalls',
			title: 'React Hooks Pitfalls',
			url: '/blog/react-hooks-pitfalls',
			snippet: 'Lexical exact match for useFetcher and form submissions',
			chunkIndex: 0,
			chunkCount: 1,
		},
	])

	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'mock-account',
		CLOUDFLARE_API_TOKEN: 'mock-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-search-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'mock-gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'mock-index',
	})

	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
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
							count: 1,
							matches: [
								{
									id: 'blog:some-other-post:chunk:0',
									score: 0.99,
									metadata: {
										type: 'blog',
										slug: 'some-other-post',
										title: 'Some Other Post',
										url: '/blog/some-other-post',
										snippet: 'A semantically related post',
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
			query: 'How do I use useFetcher in React?',
			topK: 5,
		})

		expect(results).toHaveLength(2)
		expect(results[0]?.id).toBe('blog:react-hooks-pitfalls')
		expect(results[1]?.id).toBe('blog:some-other-post')
	} finally {
		fetchSpy.mockRestore()
	}
})

test('semanticSearchKCD preserves YouTube timestamps from lexical matches', async () => {
	queryLexicalSearchMatchesMock.mockReset()
	setLatestCachifiedKey(null)
	queryLexicalSearchMatchesMock.mockResolvedValue([
		{
			id: 'youtube:abc123def45:chunk:0',
			type: 'youtube',
			slug: 'abc123def45',
			title: 'Lexical YouTube Match',
			url: '/youtube?video=abc123def45',
			snippet: 'Shallow rendering discussion',
			startSeconds: 123,
			chunkIndex: 0,
			chunkCount: 1,
		},
	])

	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'mock-account',
		CLOUDFLARE_API_TOKEN: 'mock-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-search-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'mock-gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'mock-index',
	})

	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
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
					JSON.stringify({ result: { count: 0, matches: [] } }),
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
			query: 'shallow rendering',
			topK: 5,
		})

		expect(results[0]?.url).toBe('/youtube?video=abc123def45&t=123')
	} finally {
		fetchSpy.mockRestore()
	}
})

test('semanticSearchKCD preserves zero-second YouTube timestamps from lexical matches', async () => {
	queryLexicalSearchMatchesMock.mockReset()
	setLatestCachifiedKey(null)
	queryLexicalSearchMatchesMock.mockResolvedValue([
		{
			id: 'youtube:abc123def45:chunk:0',
			type: 'youtube',
			slug: 'abc123def45',
			title: 'Lexical YouTube Match',
			url: '/youtube?video=abc123def45',
			snippet: 'Opening transcript chunk',
			startSeconds: 0,
			chunkIndex: 0,
			chunkCount: 1,
		},
	])

	using _ignoredEnv = setEnv({
		CLOUDFLARE_ACCOUNT_ID: 'mock-account',
		CLOUDFLARE_API_TOKEN: 'mock-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'runtime-search-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'mock-gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'mock-index',
	})

	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (input) => {
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
					JSON.stringify({ result: { count: 0, matches: [] } }),
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
			query: 'video intro',
			topK: 5,
		})

		expect(results[0]?.url).toBe('/youtube?video=abc123def45&t=0')
	} finally {
		fetchSpy.mockRestore()
	}
})
