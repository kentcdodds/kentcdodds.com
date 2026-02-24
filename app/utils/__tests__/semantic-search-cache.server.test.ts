import { randomUUID } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'
import {
	cachifiedSpy,
	memory,
	testCache,
} from '#tests/semantic-search-test-cache.ts'

describe('semantic search caching', () => {
	test('caches results with ttl=12h and swr=3d', async () => {
		memory.clear()
		cachifiedSpy.mockClear()

		const cacheSetSpy = vi.spyOn(testCache, 'set')
		const fetchSpy = vi.spyOn(globalThis, 'fetch')
		try {
			const { semanticSearchKCD } = await import('../semantic-search.server.ts')

			// Use a query that's unlikely to match any seeded doc titles/snippets,
			// so the Cloudflare Vectorize mock falls back to cosine similarity.
			const query = `zz_semantic_cache_test_${randomUUID()}`
			const results1 = await semanticSearchKCD({ query, topK: 5 })
			expect(results1.length).toBeGreaterThan(0)
			expect(results1.length).toBeLessThanOrEqual(5)
			expect(results1[0]).toEqual(
				expect.objectContaining({
					id: expect.any(String),
					score: expect.any(Number),
				}),
			)

			expect(memory.size).toBe(1)
			const [key, entry] = [...memory.entries()][0] ?? []
			expect(key).toMatch(/^semantic-search:kcd:v1:/u)
			expect(entry).toBeTruthy()

			const firstCallOpts = cachifiedSpy.mock.calls[0]?.[0] as
				| { ttl?: unknown; staleWhileRevalidate?: unknown }
				| undefined
			expect(firstCallOpts).toBeTruthy()
			expect(firstCallOpts?.ttl).toBe(1000 * 60 * 60 * 12)
			expect(firstCallOpts?.staleWhileRevalidate).toBe(1000 * 60 * 60 * 24 * 3)

			const fetchCallsAfterFirst = fetchSpy.mock.calls.length
			const results2 = await semanticSearchKCD({ query, topK: 5 })
			expect(results2).toEqual(results1)
			expect(fetchSpy.mock.calls).toHaveLength(fetchCallsAfterFirst)
			expect(cacheSetSpy).toHaveBeenCalledTimes(1)
		} finally {
			fetchSpy.mockRestore()
			cacheSetSpy.mockRestore()
		}
	})
})
