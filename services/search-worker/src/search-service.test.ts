import { expect, test, vi } from 'vitest'
import {
	SEARCH_MAX_QUERY_CHARS,
	SearchQueryTooLongError,
} from '#other/search/search-service.ts'
import { createSearchService, getWorkersAiRunUrl } from './search-service'
import { type Env } from './env'

function createEnv(): Env {
	return {
		SEARCH_DB: {
			exec: vi.fn(async () => undefined),
		} as unknown as D1Database,
		SEARCH_INDEX: {
			query: vi.fn(),
		} as unknown as VectorizeIndex,
		SEARCH_ARTIFACTS_BUCKET: {} as R2Bucket,
		SEARCH_WORKER_TOKEN: 'worker-secret',
		CLOUDFLARE_ACCOUNT_ID: 'cf-account',
		CLOUDFLARE_API_TOKEN: 'cf-token',
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: 'indexing-only-gateway',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
		CLOUDFLARE_AI_EMBEDDING_MODEL: '@cf/google/embeddinggemma-300m',
	}
}

test('getWorkersAiRunUrl uses CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID', () => {
	const env = createEnv()

	expect(
		getWorkersAiRunUrl({
			env,
			model: '@cf/google/embeddinggemma-300m',
		}),
	).toBe(
		'https://gateway.ai.cloudflare.com/v1/cf-account/indexing-only-gateway/workers-ai/@cf/google/embeddinggemma-300m',
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
	}
	const service = createSearchService(createEnv(), dependencies)

	const results = await service.search({
		query: 'How do I use useFetcher in React?',
		topK: 5,
	})

	expect(dependencies.ensureSchema).toHaveBeenCalled()
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
	}
	const service = createSearchService(createEnv(), dependencies)

	const results = await service.search({
		query: 'shallow rendering',
		topK: 5,
	})

	expect(results[0]?.url).toBe('/youtube?video=abc123def45&t=123')
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
	}
	const service = createSearchService(createEnv(), dependencies)

	await expect(
		service.search({
			query: 'x'.repeat(SEARCH_MAX_QUERY_CHARS + 1),
		}),
	).rejects.toBeInstanceOf(SearchQueryTooLongError)
})
