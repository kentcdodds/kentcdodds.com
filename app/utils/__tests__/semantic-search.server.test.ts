import { expect, test, vi } from 'vitest'

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
	const previousGatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID
	const previousEmbeddingGatewayId =
		process.env.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID
	process.env.CLOUDFLARE_AI_GATEWAY_ID = 'runtime-search-gateway'
	process.env.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID = 'indexing-only-gateway'

	const originalFetch = globalThis.fetch
	const fetchSpy = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation((input, init) => originalFetch(input, init))

	try {
		await semanticSearchKCD({
			query: `Gateway regression test ${Date.now()}`,
			topK: 1,
		})

		const embeddingRequestUrl = fetchSpy.mock.calls
			.map(([input]) => input.toString())
			.find((url) => url.includes('/workers-ai/'))

		expect(embeddingRequestUrl).toBeDefined()
		expect(embeddingRequestUrl).toContain('/runtime-search-gateway/')
		expect(embeddingRequestUrl).not.toContain('/indexing-only-gateway/')
	} finally {
		fetchSpy.mockRestore()
		process.env.CLOUDFLARE_AI_GATEWAY_ID = previousGatewayId ?? ''
		process.env.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID =
			previousEmbeddingGatewayId ?? ''
	}
})
