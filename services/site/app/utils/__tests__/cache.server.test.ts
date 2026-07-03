import { randomUUID } from 'node:crypto'
import { afterEach, expect, test, vi } from 'vitest'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '../runtime-bindings.server.ts'

vi.mock('../session.server.ts', () => ({
	getUser: vi.fn(),
}))

afterEach(() => {
	clearRuntimeBindingSource()
})

function createD1Binding() {
	return {
		prepare: vi.fn(),
		batch: vi.fn(),
		exec: vi.fn(),
		dump: vi.fn(),
		withSession: vi.fn(),
	}
}

test('uses the lru cache when an APP_DB binding is present', async () => {
	setRuntimeBindingSource({ APP_DB: createD1Binding() })
	const { cache, getAllCacheKeys } = await import('../cache.server.ts')
	const key = `worker-cache:${randomUUID()}`
	const entry = {
		value: { ok: true },
		metadata: {
			createdTime: Date.now(),
			swr: 0,
			ttl: 60_000,
		},
	}

	await cache.set(key, entry)

	await expect(cache.get(key)).resolves.toEqual(entry)
	await expect(getAllCacheKeys(100)).resolves.toMatchObject({
		sqlite: [],
		lru: expect.arrayContaining([key]),
	})
})
