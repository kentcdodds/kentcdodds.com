import { describe, expect, test, vi } from 'vitest'

type CachePayload = {
	value: unknown
	metadata: { createdTime: number; swr: number; ttl: number }
}

function createMockKvNamespace() {
	const store = new Map<string, string>()
	return {
		async get(key: string) {
			return store.get(key) ?? null
		},
		async put(key: string, value: string) {
			store.set(key, value)
		},
		async delete(key: string) {
			store.delete(key)
		},
		async list(options?: { prefix?: string; limit?: number }) {
			const keys = [...store.keys()]
				.filter((key) => (options?.prefix ? key.startsWith(options.prefix) : true))
				.slice(0, options?.limit ?? Number.MAX_SAFE_INTEGER)
				.map((name) => ({ name }))
			return { keys }
		},
	}
}

describe('cache kv adapter', () => {
	test('reads and writes cache entries through kv binding', async () => {
		vi.resetModules()
		vi.doMock('../session.server.ts', () => ({ getUser: async () => null }))

		const kv = createMockKvNamespace()
		const runtimeBindingsModule = await import('../runtime-bindings.server.ts')
		runtimeBindingsModule.setRuntimeBindingSource({ SITE_CACHE_KV: kv })

		try {
			const { cache, getAllCacheKeys } = await import('../cache.server.ts')
			const entry: CachePayload = {
				value: { message: 'hello' },
				metadata: { createdTime: Date.now(), swr: 1000, ttl: 1000 },
			}

			await cache.set('example-key', entry)
			const result = await cache.get('example-key')
			expect(result).toEqual(entry)

			expect((await getAllCacheKeys(10)).shared).toContain('example-key')

			await cache.delete('example-key')
			expect(await cache.get('example-key')).toBeNull()
		} finally {
			runtimeBindingsModule.clearRuntimeBindingSource()
			vi.restoreAllMocks()
			vi.unmock('../session.server.ts')
		}
	})
})
