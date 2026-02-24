import { randomUUID } from 'node:crypto'
import { expect, test, vi } from 'vitest'
import { semanticSearchKCD } from '../semantic-search.server.ts'

test('semanticSearchKCD caches by normalized query + topK (skips network on hit)', async () => {
	const id = randomUUID()
	const noisyQuery = `  zz   semantic   cache test   ${id}  `
	const normalizedQuery = `zz semantic cache test ${id}`

	const fetchSpy = vi.spyOn(globalThis, 'fetch')
	try {
		fetchSpy.mockClear()
		await semanticSearchKCD({ query: noisyQuery, topK: 3 })
		expect(fetchSpy).toHaveBeenCalled()

		// Same semantic query, different whitespace: should hit cache.
		fetchSpy.mockClear()
		await semanticSearchKCD({ query: normalizedQuery, topK: 3 })
		expect(fetchSpy).not.toHaveBeenCalled()

		// Different topK should be a different cache key.
		fetchSpy.mockClear()
		await semanticSearchKCD({ query: normalizedQuery, topK: 4 })
		expect(fetchSpy).toHaveBeenCalled()
	} finally {
		fetchSpy.mockRestore()
	}
})

