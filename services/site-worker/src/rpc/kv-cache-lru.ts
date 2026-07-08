import { totalTtl, type CacheEntry } from '@epic-web/cachified'
import { LRUCache } from 'lru-cache'

const KV_CACHE_LRU_MAX = 1000

const kvCacheLru = new LRUCache<string, CacheEntry<unknown>>({
	max: KV_CACHE_LRU_MAX,
})

export function getKvCacheLruEntry(key: string) {
	return kvCacheLru.get(key) ?? null
}

export function setKvCacheLruEntry(key: string, entry: CacheEntry<unknown>) {
	const ttl = totalTtl(entry.metadata)
	return kvCacheLru.set(key, entry, {
		ttl: ttl === Infinity ? undefined : ttl,
		start: entry.metadata.createdTime,
	})
}

export function deleteKvCacheLruEntry(key: string) {
	return kvCacheLru.delete(key)
}
