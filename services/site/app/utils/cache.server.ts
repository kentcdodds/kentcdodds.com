import {
	type Cache,
	cachified as baseCachified,
	type CacheEntry,
	type Cache as CachifiedCache,
	type CachifiedOptions,
	totalTtl,
} from '@epic-web/cachified'
import { siteCacheReporter } from '#app/utils/cache-reporter.server.ts'
import { remember } from '@epic-web/remember'
import { LRUCache } from 'lru-cache'
import {
	decodeCacheEntry,
	encodeCacheEntry,
	getKvExpirationTtl,
} from '#app/utils/cache-encoding.server.ts'
import {
	recordCacheLruHit,
	recordCacheRpcCall,
} from '#app/utils/cache-request-stats.server.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import { getUser } from './session.server.ts'
import { time, type Timings } from './timing.server.ts'

type CacheRpcBinding = {
	get(key: string): Promise<CacheEntry<unknown> | null>
	set(key: string, entry: CacheEntry<unknown>): Promise<void>
	delete(key: string): Promise<void>
	keys(prefix?: string, limit?: number): Promise<Array<string>>
}

function getCacheRpcBinding(): CacheRpcBinding | undefined {
	const binding = getRuntimeBinding<CacheRpcBinding>('CACHE_RPC')
	if (!binding || typeof binding.get !== 'function') return undefined
	return binding
}

type DirectKvNamespace = {
	get(key: string): Promise<string | null>
	put(
		key: string,
		value: string,
		options?: { expirationTtl?: number },
	): Promise<void>
	delete(key: string): Promise<void>
	list(options?: {
		prefix?: string
		limit?: number
	}): Promise<{ keys: Array<{ name: string }> }>
}

function getDirectKvBinding(): DirectKvNamespace | undefined {
	const binding = getRuntimeBinding<DirectKvNamespace>('SITE_CACHE_KV')
	if (!binding || typeof binding.get !== 'function') return undefined
	return binding
}

function usesPersistentKvCache() {
	return Boolean(getCacheRpcBinding() || getDirectKvBinding())
}

const LRU_MAX_ENTRIES = 500

const lruInstance = remember(
	'lru-cache',
	() => new LRUCache<string, CacheEntry<unknown>>({ max: LRU_MAX_ENTRIES }),
)

export type { CacheRequestStats } from '#app/utils/cache-request-stats.server.ts'
export {
	beginCacheRequestStats,
	endCacheRequestStats,
	formatCacheRequestStatsHeader,
} from '#app/utils/cache-request-stats.server.ts'

export function isCacheAdminAvailable() {
	return usesPersistentKvCache()
}

export function getPersistentCacheLabel() {
	return 'KV'
}

export const lruCache = {
	set(key, value) {
		const ttl = totalTtl(value.metadata)
		return lruInstance.set(key, value, {
			ttl: ttl === Infinity ? undefined : ttl,
			start: value.metadata.createdTime,
		})
	},
	get(key) {
		return lruInstance.get(key)
	},
	delete(key) {
		return lruInstance.delete(key)
	},
} satisfies Cache

async function getDirectKvCacheEntry(key: string) {
	const kv = getDirectKvBinding()
	if (!kv) return null
	const stored = await kv.get(key)
	if (!stored) return null
	return decodeCacheEntry(JSON.parse(stored))
}

async function setDirectKvCacheEntry(key: string, entry: CacheEntry<unknown>) {
	const kv = getDirectKvBinding()
	if (!kv) return
	const encoded = encodeCacheEntry(entry)
	const expirationTtl = getKvExpirationTtl(entry)
	await kv.put(key, JSON.stringify(encoded), expirationTtl ? { expirationTtl } : undefined)
}

async function deleteDirectKvCacheEntry(key: string) {
	const kv = getDirectKvBinding()
	if (!kv) return
	await kv.delete(key)
}

async function listDirectKvCacheKeys(prefix: string | undefined, limit: number) {
	const kv = getDirectKvBinding()
	if (!kv) return []
	const listed = await kv.list({ prefix, limit })
	return listed.keys.map((entry) => entry.name)
}

export const cache: CachifiedCache = {
	name: 'Application cache',
	async get(key) {
		const rpc = getCacheRpcBinding()
		if (rpc) {
			const lruHit = lruCache.get(key)
			if (lruHit) {
				recordCacheLruHit()
				return lruHit
			}
			const rpcStart = performance.now()
			const entry = await rpc.get(key)
			recordCacheRpcCall(performance.now() - rpcStart)
			if (entry) lruCache.set(key, entry)
			return entry
		}
		const directKv = getDirectKvBinding()
		if (directKv) {
			const lruHit = lruCache.get(key)
			if (lruHit) {
				recordCacheLruHit()
				return lruHit
			}
			const kvStart = performance.now()
			const entry = await getDirectKvCacheEntry(key)
			recordCacheRpcCall(performance.now() - kvStart)
			if (entry) lruCache.set(key, entry)
			return entry
		}
		return null
	},
	async set(key, entry) {
		const rpc = getCacheRpcBinding()
		if (rpc) {
			lruCache.set(key, entry)
			await rpc.set(key, entry)
			return
		}
		if (getDirectKvBinding()) {
			lruCache.set(key, entry)
			await setDirectKvCacheEntry(key, entry)
		}
	},
	async delete(key) {
		const rpc = getCacheRpcBinding()
		if (rpc) {
			lruCache.delete(key)
			await rpc.delete(key)
			return
		}
		if (getDirectKvBinding()) {
			lruCache.delete(key)
			await deleteDirectKvCacheEntry(key)
		}
	},
}

export async function getAllCacheKeys(limit: number) {
	const rpc = getCacheRpcBinding()
	if (rpc) {
		return {
			sqlite: await rpc.keys(undefined, limit),
			lru: [...lruInstance.keys()],
		}
	}
	const directKv = getDirectKvBinding()
	if (directKv) {
		return {
			sqlite: await listDirectKvCacheKeys(undefined, limit),
			lru: [...lruInstance.keys()],
		}
	}
	return {
		sqlite: [],
		lru: [...lruInstance.keys()],
	}
}

export async function searchCacheKeys(search: string, limit: number) {
	const rpc = getCacheRpcBinding()
	if (rpc) {
		const keys = await rpc.keys(search, limit)
		return {
			sqlite: keys,
			lru: [...lruInstance.keys()].filter((key) => key.includes(search)),
		}
	}
	const directKv = getDirectKvBinding()
	if (directKv) {
		const keys = await listDirectKvCacheKeys(search, limit)
		return {
			sqlite: keys,
			lru: [...lruInstance.keys()].filter((key) => key.includes(search)),
		}
	}
	return {
		sqlite: [],
		lru: [...lruInstance.keys()].filter((key) => key.includes(search)),
	}
}

export async function shouldForceFresh({
	forceFresh,
	request,
	key,
}: {
	forceFresh?: boolean | string
	request?: Request
	key: string
}) {
	if (typeof forceFresh === 'boolean') return forceFresh
	if (typeof forceFresh === 'string') return forceFresh.split(',').includes(key)

	if (!request) return false
	const fresh = new URL(request.url).searchParams.get('fresh')
	if (typeof fresh !== 'string') return false
	if ((await getUser(request))?.role !== 'ADMIN') return false
	if (fresh === '') return true

	return fresh.split(',').includes(key)
}

export async function cachified<Value>({
	request,
	timings,
	...options
}: Omit<CachifiedOptions<Value>, 'forceFresh'> & {
	request?: Request
	timings?: Timings
	forceFresh?: boolean | string
}): Promise<Value> {
	let cachifiedResolved = false
	const cachifiedPromise = baseCachified(
		{
			...options,
			forceFresh: await shouldForceFresh({
				forceFresh: options.forceFresh,
				request,
				key: options.key,
			}),
			getFreshValue: async (context) => {
				// if we've already retrieved the cached value, then this may be called
				// after the response has already been sent so there's no point in timing
				// how long this is going to take
				if (!cachifiedResolved && timings) {
					return time(() => options.getFreshValue(context), {
						timings,
						type: `getFreshValue:${options.key}`,
						desc: `request forced to wait for a fresh ${options.key} value`,
					})
				}
				return options.getFreshValue(context)
			},
		},
		siteCacheReporter<Value>(),
	)
	const result = await time(cachifiedPromise, {
		timings,
		type: `cache:${options.key}`,
		desc: `${options.key} cache retrieval`,
	})
	cachifiedResolved = true
	return result
}
