import { randomUUID } from 'node:crypto'
import { afterEach, expect, test, vi } from 'vitest'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'

const sessionServerMocks = vi.hoisted(() => ({
	requireAdminUser: vi.fn(),
}))

vi.mock('#app/utils/session.server.ts', () => sessionServerMocks)

import { action as cacheAdminAction, loader as cacheAdminLoader } from '../../cache.admin.tsx'
import { loader as kvCacheResourceLoader } from '../cache.kv_.$cacheKey.ts'
import { loader as lruCacheResourceLoader } from '../cache.lru.$cacheKey.ts'
import { loader as sqliteCacheResourceLoader } from '../cache.sqlite_.$cacheKey.ts'

afterEach(() => {
	clearRuntimeBindingSource()
	vi.clearAllMocks()
})

function createCacheRpcBinding() {
	return {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		keys: vi.fn(),
	}
}

test('cache admin lists kv and lru keys when CACHE_RPC is available', async () => {
	const rpcKeys = ['rpc-key:one', 'rpc-key:two']
	const cacheRpc = createCacheRpcBinding()
	cacheRpc.keys.mockResolvedValue(rpcKeys)
	setRuntimeBindingSource({ CACHE_RPC: cacheRpc })

	const { lruCache } = await import('#app/utils/cache.server.ts')
	const lruKey = `lru-route:${randomUUID()}`
	lruCache.set(lruKey, {
		value: { ok: true },
		metadata: {
			createdTime: Date.now(),
			swr: 0,
			ttl: 60_000,
		},
	})

	const result = (await cacheAdminLoader({
		request: new Request('http://localhost/cache/admin'),
	} as any)) as {
		type?: string
		data?: {
			cacheKeys: { kv: string[]; lru: string[] }
			persistentCacheLabel: string
		}
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data?.persistentCacheLabel).toBe('KV')
	expect(result.data?.cacheKeys).toEqual({
		kv: rpcKeys,
		lru: [lruKey],
	})
	expect(cacheRpc.keys).toHaveBeenCalledWith(undefined, 100)
})

test('cache admin deletes kv keys when CACHE_RPC is available', async () => {
	const cacheRpc = createCacheRpcBinding()
	cacheRpc.delete.mockResolvedValue(undefined)
	setRuntimeBindingSource({ CACHE_RPC: cacheRpc })
	const { cache } = await import('#app/utils/cache.server.ts')
	const key = `rpc-delete:${randomUUID()}`
	await cache.set(key, {
		value: { ok: true },
		metadata: {
			createdTime: Date.now(),
			swr: 0,
			ttl: 60_000,
		},
	})
	cacheRpc.delete.mockClear()

	const result = (await cacheAdminAction({
		request: new Request('http://localhost/cache/admin', {
			method: 'POST',
			body: new URLSearchParams({
				cacheKey: key,
				type: 'kv',
			}),
		}),
	} as any)) as { type?: string; data?: unknown }

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ success: true })
	expect(cacheRpc.delete).toHaveBeenCalledWith(key)
})

test('persistent cache resources work when CACHE_RPC is available', async () => {
	const cacheRpc = createCacheRpcBinding()
	const entry = {
		value: { ok: true },
		metadata: {
			createdTime: Date.now(),
			swr: 0,
			ttl: 60_000,
		},
	}
	cacheRpc.get.mockResolvedValue(entry)
	setRuntimeBindingSource({ CACHE_RPC: cacheRpc })

	const result = (await kvCacheResourceLoader({
		request: new Request('http://localhost/resources/cache/kv/key'),
		params: { cacheKey: 'key' },
	} as any)) as {
		type?: string
		data?: unknown
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({
		cacheKey: 'key',
		value: entry,
	})
	expect(cacheRpc.get).toHaveBeenCalledWith('key')
})

test('legacy sqlite cache resource URLs redirect to kv', async () => {
	const request = new Request(
		'http://localhost/resources/cache/sqlite/my-key?fresh=1',
	)

	let thrown: unknown
	try {
		await sqliteCacheResourceLoader({
			request,
			params: { cacheKey: 'my-key' },
		} as any)
	} catch (error: unknown) {
		thrown = error
	}

	expect(thrown).toBeInstanceOf(Response)
	const response = thrown as Response
	expect(response.status).toBe(308)
	expect(response.headers.get('Location')).toBe(
		'/resources/cache/kv/my-key?fresh=1',
	)
})

test('lru cache resources no longer expose instance metadata', async () => {
	const { lruCache } = await import('#app/utils/cache.server.ts')
	const cacheKey = `lru-route:${randomUUID()}`
	const entry = {
		value: { ok: true },
		metadata: {
			createdTime: Date.now(),
			swr: 0,
			ttl: 60_000,
		},
	}
	lruCache.set(cacheKey, entry)

	const result = (await lruCacheResourceLoader({
		request: new Request(
			`http://localhost/resources/cache/lru/${encodeURIComponent(cacheKey)}`,
		),
		params: { cacheKey },
	} as any)) as {
		type?: string
		data?: unknown
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({
		cacheKey,
		value: entry,
	})
})
