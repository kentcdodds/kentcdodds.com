import { vi } from 'vitest'

export const memory = new Map<string, unknown>()

export const testCache = {
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

export const cachifiedSpy = vi.fn()

vi.mock('#app/utils/cache.server.ts', async () => {
	const { cachified } = await import('@epic-web/cachified')

	return {
		cache: testCache,
		cachified: async (options: any) => {
			cachifiedSpy(options)
			// The app's cachified wrapper supports extra keys (request/timings).
			// Tests only care about caching behavior, so strip them.
			const { request: _request, timings: _timings, ...rest } = options ?? {}
			return await cachified(rest)
		},
	}
})

