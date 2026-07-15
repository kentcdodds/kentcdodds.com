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

test('uses the lru cache before CACHE_RPC on worker cache hits', async () => {
	const rpcGet = vi.fn().mockResolvedValue(null)
	setRuntimeBindingSource({
		CACHE_RPC: {
			get: rpcGet,
			set: vi.fn(),
			delete: vi.fn(),
			keys: vi.fn(),
		},
	})
	const { beginCacheRequestStats, cache, formatCacheRequestStatsHeader } =
		await import('../cache.server.ts')
	const { runWithRequestContext } = await import('../request-context.server.ts')
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
	const stats = await runWithRequestContext(async () => {
		const requestStats = beginCacheRequestStats()
		await expect(cache.get(key)).resolves.toEqual(entry)
		return requestStats
	})

	expect(rpcGet).not.toHaveBeenCalled()
	expect(formatCacheRequestStatsHeader(stats)).toBe(
		'lru_hits=1,rpc_calls=0,rpc_ms=0.0',
	)
})

test('lists kv keys from CACHE_RPC in getAllCacheKeys', async () => {
	const rpcKeys = ['kv-key:a', 'kv-key:b']
	const cacheRpc = {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		keys: vi.fn().mockResolvedValue(rpcKeys),
	}
	setRuntimeBindingSource({ CACHE_RPC: cacheRpc })
	const { getAllCacheKeys } = await import('../cache.server.ts')

	await expect(getAllCacheKeys(50)).resolves.toMatchObject({
		kv: rpcKeys,
		lru: expect.any(Array),
	})
	expect(cacheRpc.keys).toHaveBeenCalledWith(undefined, 50)
})

test('searches kv keys from CACHE_RPC in searchCacheKeys', async () => {
	const rpcKeys = ['search-hit']
	const cacheRpc = {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		keys: vi.fn().mockResolvedValue(rpcKeys),
	}
	setRuntimeBindingSource({ CACHE_RPC: cacheRpc })
	const { searchCacheKeys } = await import('../cache.server.ts')

	await expect(searchCacheKeys('search', 25)).resolves.toMatchObject({
		kv: rpcKeys,
		lru: expect.any(Array),
	})
	expect(cacheRpc.keys).toHaveBeenCalledWith('search', 25)
})

test('invalidates the parent page cache through CACHE_RPC', async () => {
	const bumpPageCacheGeneration = vi.fn().mockResolvedValue('pages-123')
	setRuntimeBindingSource({
		CACHE_RPC: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			keys: vi.fn(),
			bumpPageCacheGeneration,
		},
	})
	const { invalidatePageCache } = await import('../cache.server.ts')

	await expect(invalidatePageCache()).resolves.toBe('pages-123')
	expect(bumpPageCacheGeneration).toHaveBeenCalledOnce()
})
