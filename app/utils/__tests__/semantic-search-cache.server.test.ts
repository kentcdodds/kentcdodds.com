import { randomUUID } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'

const memory = new Map<string, unknown>()
const testCache = {
	name: 'test-cache',
	get(key: string) {
		return (memory.get(key) as any) ?? null
	},
	async set(key: string, entry: unknown) {
		memory.set(key, entry)
	},
	async delete(key: string) {
		memory.delete(key)
	},
}

vi.mock('#app/utils/cache.server.ts', async () => {
	const { cachified } = await import('@epic-web/cachified')
	return { cachified, cache: testCache }
})

describe('semantic search caching', () => {
	test('caches results with ttl=12h and swr=3d', async () => {
		memory.clear()
		const { semanticSearchKCD } = await import('../semantic-search.server.ts')

		const query = `semantic_search_cache_test_${randomUUID()}`
		const results = await semanticSearchKCD({ query, topK: 5 })
		expect(Array.isArray(results)).toBe(true)

		expect(memory.size).toBe(1)
		const [key, entry] = [...memory.entries()][0] ?? []
		expect(key).toMatch(/^semantic-search:kcd:v1:/u)
		expect(entry).toBeTruthy()

		const metadata = (entry as any).metadata as unknown
		expect(metadata).toBeTruthy()
		expect((metadata as any).ttl).toBe(1000 * 60 * 60 * 12)
		expect((metadata as any).swr).toBe(1000 * 60 * 60 * 24 * 3)
	})
})

