import { vi } from 'vitest'

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

const cachifiedSpy = vi.fn()

vi.mock('#app/utils/cache.server.ts', async () => {
	const { cachified } = await import('@epic-web/cachified')
	return {
		cache: testCache,
		cachified: (opts: Parameters<typeof cachified>[0]) => {
			cachifiedSpy(opts)
			return cachified(opts)
		},
	}
})

export { cachifiedSpy, memory, testCache }
