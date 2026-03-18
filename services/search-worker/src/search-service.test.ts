import { expect, test, vi } from 'vitest'
import {
	SEARCH_MAX_QUERY_CHARS,
	SearchQueryTooLongError,
} from '@kcd-internal/search-shared'
import { createSearchService, getEmbedding } from './search-service'
import { type Env } from './env'

function createEnv(): Env {
	const run = vi.fn(async () => ({
		data: [[0.1, 0.2, 0.3]],
	}))
	return {
		SEARCH_DB: {
			exec: vi.fn(async () => undefined),
		} as unknown as D1Database,
		SEARCH_INDEX: {
			query: vi.fn(),
		} as unknown as VectorizeIndex,
		SEARCH_ARTIFACTS_BUCKET: {} as R2Bucket,
		AI: {
			run,
			gateway: vi.fn(),
			aiGatewayLogId: null,
		} as unknown as Ai,
		SEARCH_WORKER_TOKEN: 'worker-secret',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'indexing-only-gateway',
		CLOUDFLARE_AI_EMBEDDING_MODEL: '@cf/google/embeddinggemma-300m',
	}
}

test('getEmbedding routes through the AI binding with gateway id', async () => {
	const env = createEnv()
	const run = vi.mocked(env.AI.run)

	const vector = await getEmbedding({
		env,
		text: 'hello world',
		model: '@cf/google/embeddinggemma-300m',
	})

	expect(vector).toEqual([0.1, 0.2, 0.3])
	expect(run).toHaveBeenCalledWith(
		'@cf/google/embeddinggemma-300m',
		{ text: ['hello world'] },
		{
			gateway: {
				id: 'indexing-only-gateway',
			},
		},
	)
})

test('search fuses lexical matches with semantic matches', async () => {
	const dependencies = {
		ensureSchema: vi.fn(async () => undefined),
		queryLexicalMatches: vi.fn(async () => [
			{
				id: 'blog:react-hooks-pitfalls:chunk:0',
				type: 'blog',
				slug: 'react-hooks-pitfalls',
				title: 'React Hooks Pitfalls',
				url: '/blog/react-hooks-pitfalls',
				snippet: 'Lexical exact match for useFetcher and form submissions',
			},
		]),
		getEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
		queryVectorize: vi.fn(async () => [
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
		]),
		syncArtifacts: vi.fn(async () => ({
			syncedAt: '2026-03-17T00:00:00.000Z',
		})),
		getSyncedAt: vi.fn(async () => '2026-03-17T00:00:00.000Z'),
	}
	const service = createSearchService(createEnv(), dependencies)

	const { results, noCloseMatches } = await service.search({
		query: 'How do I use useFetcher in React?',
		topK: 5,
	})

	expect(dependencies.ensureSchema).toHaveBeenCalled()
	expect(noCloseMatches).toBe(false)
	expect(results).toHaveLength(2)
	expect(results[0]?.id).toBe('blog:react-hooks-pitfalls')
	expect(results[1]?.id).toBe('blog:some-other-post')
})

test('search preserves YouTube timestamps from lexical matches', async () => {
	const dependencies = {
		ensureSchema: vi.fn(async () => undefined),
		queryLexicalMatches: vi.fn(async () => [
			{
				id: 'youtube:abc123def45:chunk:0',
				type: 'youtube',
				slug: 'abc123def45',
				title: 'Lexical YouTube Match',
				url: '/youtube?video=abc123def45',
				snippet: 'Shallow rendering discussion',
				startSeconds: 123,
			},
		]),
		getEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
		queryVectorize: vi.fn(async () => []),
		syncArtifacts: vi.fn(async () => ({
			syncedAt: '2026-03-17T00:00:00.000Z',
		})),
		getSyncedAt: vi.fn(async () => '2026-03-17T00:00:00.000Z'),
	}
	const service = createSearchService(createEnv(), dependencies)

	const { results } = await service.search({
		query: 'shallow rendering',
		topK: 5,
	})

	expect(results[0]?.url).toBe('/youtube?video=abc123def45&t=123')
})

test('search with SEARCH_LEXICAL_ONLY skips embedding and Vectorize', async () => {
	const env = { ...createEnv(), SEARCH_LEXICAL_ONLY: 'true' }
	const getEmbedding = vi.fn(async () => [0.1, 0.2, 0.3])
	const queryVectorize = vi.fn(async () => [])
	const dependencies = {
		ensureSchema: vi.fn(async () => undefined),
		queryLexicalMatches: vi.fn(async () => [
			{
				id: 'blog:only-lexical:chunk:0',
				type: 'blog',
				slug: 'only-lexical',
				title: 'Lexical Only',
				url: '/blog/only-lexical',
				snippet: 'snippet',
			},
		]),
		getEmbedding,
		queryVectorize,
		syncArtifacts: vi.fn(async () => ({
			syncedAt: '2026-03-17T00:00:00.000Z',
		})),
		getSyncedAt: vi.fn(async () => '2026-03-17T00:00:00.000Z'),
	}
	const service = createSearchService(env, dependencies)

	const { results } = await service.search({ query: 'test', topK: 5 })

	expect(getEmbedding).not.toHaveBeenCalled()
	expect(queryVectorize).not.toHaveBeenCalled()
	expect(results).toHaveLength(1)
	expect(results[0]?.id).toBe('blog:only-lexical')
})

test('search drops weak tail below relative confidence of top hit', async () => {
	const dependencies = {
		ensureSchema: vi.fn(async () => undefined),
		queryLexicalMatches: vi.fn(async () => [
			{
				id: 'blog:strong:chunk:0',
				type: 'blog',
				slug: 'strong',
				title: 'Strong',
				url: '/blog/strong',
				snippet: 's',
			},
		]),
		getEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
		queryVectorize: vi.fn(async () => {
			const deep = Array.from({ length: 55 }, (_, i) => ({
				id: `blog:deep-${i}:chunk:0`,
				score: 0.9 - i * 0.01,
				metadata: {
					type: 'blog',
					slug: `deep-${i}`,
					title: `Deep ${i}`,
					url: `/blog/deep-${i}`,
					snippet: 'd',
				},
			}))
			return [
				{
					id: 'blog:strong:chunk:0',
					score: 0.99,
					metadata: {
						type: 'blog',
						slug: 'strong',
						title: 'Strong',
						url: '/blog/strong',
						snippet: 's',
					},
				},
				...deep,
			]
		}),
		syncArtifacts: vi.fn(async () => ({
			syncedAt: '2026-03-17T00:00:00.000Z',
		})),
		getSyncedAt: vi.fn(async () => '2026-03-17T00:00:00.000Z'),
	}
	const service = createSearchService(createEnv(), dependencies)

	const { results, lowRankingResults, noCloseMatches } = await service.search({
		query: 'test',
		topK: 15,
	})

	expect(noCloseMatches).toBe(false)
	expect(results.some((r) => r.id === 'blog:strong')).toBe(true)
	expect(
		results.filter((r) => r.id.startsWith('blog:deep-')).length,
	).toBeLessThanOrEqual(2)
	expect(results[0]?.id).toBe('blog:strong')
	expect(
		lowRankingResults.some((r) => r.id.startsWith('blog:deep-')),
	).toBe(true)
})

test('search rejects overly long queries', async () => {
	const dependencies = {
		ensureSchema: vi.fn(async () => undefined),
		queryLexicalMatches: vi.fn(async () => []),
		getEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
		queryVectorize: vi.fn(async () => []),
		syncArtifacts: vi.fn(async () => ({
			syncedAt: '2026-03-17T00:00:00.000Z',
		})),
		getSyncedAt: vi.fn(async () => '2026-03-17T00:00:00.000Z'),
	}
	const service = createSearchService(createEnv(), dependencies)

	await expect(
		service.search({
			query: 'x'.repeat(SEARCH_MAX_QUERY_CHARS + 1),
		}),
	).rejects.toBeInstanceOf(SearchQueryTooLongError)
})
