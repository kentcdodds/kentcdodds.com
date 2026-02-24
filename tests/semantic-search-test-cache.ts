import { type CacheEntry, cachified, verboseReporter } from '@epic-web/cachified'
import { vi } from 'vitest'

// These tests want to assert caching behavior deterministically without hitting
// the SQLite-backed cache implementation.
export const memory = new Map<string, CacheEntry<unknown>>()

export const testCache = {
	name: 'semantic-search-test-cache',
	get(key: string) {
		return memory.get(key) ?? null
	},
	async set(key: string, entry: CacheEntry<unknown>) {
		memory.set(key, entry)
	},
	async delete(key: string) {
		memory.delete(key)
	},
}

export const cachifiedSpy = vi.fn()

vi.mock('#app/utils/cache.server.ts', () => {
	return {
		cache: testCache,
		cachified: async (options: any) => {
			cachifiedSpy(options)
			return await cachified(options, verboseReporter())
		},
	}
})

