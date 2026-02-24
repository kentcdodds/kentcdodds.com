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
	type BaseCachifiedOptions = Parameters<typeof cachified>[0]

	return {
		cache: testCache,
		cachified: async (options: unknown) => {
			cachifiedSpy(options)
			return await cachified(options as BaseCachifiedOptions)
		},
	}
})

