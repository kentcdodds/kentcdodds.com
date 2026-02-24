import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { semanticSearchKCD } from '../semantic-search.server.ts'

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

vi.mock('#app/utils/cloudflare-ai-utils.server.ts', () => ({
	getWorkersAiRunUrl: () => 'https://workers-ai.example.com/run',
}))

vi.mock('#app/utils/env.server.ts', () => ({
	getEnv: () => ({
		CLOUDFLARE_ACCOUNT_ID: 'account-id',
		CLOUDFLARE_API_TOKEN: 'api-token',
		CLOUDFLARE_AI_GATEWAY_ID: 'gateway-id',
		CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: 'gateway-auth-token',
		CLOUDFLARE_VECTORIZE_INDEX: 'semantic-search-index',
		CLOUDFLARE_AI_EMBEDDING_MODEL: '@cf/baai/bge-base-en-v1.5',
	}),
}))

vi.mock('#app/utils/semantic-search-presentation.server.ts', () => ({
	getSemanticSearchPresentation: async () => ({}),
}))

function jsonResponse(payload: unknown) {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}

function mockSemanticSearchNetwork({
	startSeconds,
	endSeconds,
}: {
	startSeconds: number
	endSeconds: number
}) {
	const fetchMock = vi.fn(async (input: string | URL | Request) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
		if (url === 'https://workers-ai.example.com/run') {
			return jsonResponse({ result: { data: [[0.11, 0.22, 0.33]] } })
		}
		if (
			url ===
			'https://api.cloudflare.com/client/v4/accounts/account-id/vectorize/v2/indexes/semantic-search-index/query'
		) {
			return jsonResponse({
				result: {
					count: 1,
					matches: [
						{
							id: 'youtube:abc123xyz89:chunk:0',
							score: 0.98,
							metadata: {
								type: 'youtube',
								slug: 'abc123xyz89',
								title: 'Timestamp test video',
								url: '/youtube?video=abc123xyz89',
								snippet: 'matching snippet',
								startSeconds,
								endSeconds,
							},
						},
					],
				},
			})
		}
		throw new Error(`Unexpected fetch URL: ${url}`)
	})

	vi.stubGlobal('fetch', fetchMock)
}

beforeEach(() => {
	vi.restoreAllMocks()
})

afterEach(() => {
	vi.unstubAllGlobals()
})

test('keeps long transcript chunk timestamps in seconds', async () => {
	mockSemanticSearchNetwork({
		startSeconds: 3600,
		endSeconds: 5000,
	})

	const results = await semanticSearchKCD({
		query: 'long transcript span',
		topK: 1,
	})

	expect(results).toHaveLength(1)
	expect(results[0]?.timestampSeconds).toBe(3600)
	expect(results[0]?.url).toBe('/youtube?video=abc123xyz89&t=3600')
})

test('normalizes obvious millisecond timestamps to seconds', async () => {
	mockSemanticSearchNetwork({
		startSeconds: 123_000,
		endSeconds: 129_000,
	})

	const results = await semanticSearchKCD({
		query: 'milliseconds metadata',
		topK: 1,
	})

	expect(results).toHaveLength(1)
	expect(results[0]?.timestampSeconds).toBe(123)
	expect(results[0]?.url).toBe('/youtube?video=abc123xyz89&t=123')
})
