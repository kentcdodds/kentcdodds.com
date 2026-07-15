import { WorkerEntrypoint } from 'cloudflare:workers'
import type { CacheEntry } from '@epic-web/cachified'
import {
	decodeCacheEntry,
	encodeCacheEntry,
	getKvExpirationTtl,
} from '../../../site/app/utils/cache-encoding.server.ts'
import { callKentEpisodesCacheGenerationKey } from '../../../site/app/utils/call-kent-cache-keys.ts'
import type { ParentWorkerEnv } from './types.ts'
import { bumpPageCacheGeneration } from '../page-cache.ts'
import {
	deleteKvCacheLruEntry,
	getKvCacheLruEntry,
	setKvCacheLruEntry,
} from './kv-cache-lru.ts'

const KV_VALUE_PREFIX = 'cache:value:'
const KV_METADATA_PREFIX = 'cache:metadata:'
const KV_EDGE_CACHE_TTL_SECONDS = 60

export class CacheRpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async get(key: string) {
		const lruHit = getKvCacheLruEntry(key)
		if (lruHit) return lruHit

		const kvGetOptions = { cacheTtl: KV_EDGE_CACHE_TTL_SECONDS }
		const [valueRaw, metadataRaw] = await Promise.all([
			this.env.SITE_CACHE_KV.get(`${KV_VALUE_PREFIX}${key}`, kvGetOptions),
			this.env.SITE_CACHE_KV.get(`${KV_METADATA_PREFIX}${key}`, kvGetOptions),
		])

		const entry = decodeCacheEntry(
			valueRaw && metadataRaw
				? { value: valueRaw, metadata: metadataRaw }
				: null,
		)
		if (entry) setKvCacheLruEntry(key, entry)
		return entry
	}

	async set(key: string, entry: CacheEntry<unknown>) {
		setKvCacheLruEntry(key, entry)
		const encoded = encodeCacheEntry(entry)
		const expirationTtl = getKvExpirationTtl(entry)
		const putOptions = expirationTtl ? { expirationTtl } : undefined

		await Promise.all([
			this.env.SITE_CACHE_KV.put(
				`${KV_VALUE_PREFIX}${key}`,
				encoded.value,
				putOptions,
			),
			this.env.SITE_CACHE_KV.put(
				`${KV_METADATA_PREFIX}${key}`,
				encoded.metadata,
				putOptions,
			),
		])
	}

	async delete(key: string) {
		deleteKvCacheLruEntry(key)
		await Promise.all([
			this.env.SITE_CACHE_KV.delete(`${KV_VALUE_PREFIX}${key}`),
			this.env.SITE_CACHE_KV.delete(`${KV_METADATA_PREFIX}${key}`),
		])
	}

	async keys(prefix?: string, limit = 1000) {
		const list = await this.env.SITE_CACHE_KV.list({
			prefix: prefix ? `${KV_VALUE_PREFIX}${prefix}` : KV_VALUE_PREFIX,
			limit,
		})

		return list.keys.map((entry) => entry.name.slice(KV_VALUE_PREFIX.length))
	}

	async bumpPageCacheGeneration() {
		return bumpPageCacheGeneration(this.env.CONTENT_KV)
	}

	async getCallKentEpisodesCacheGeneration() {
		return (
			(await this.env.CONTENT_KV.get(callKentEpisodesCacheGenerationKey)) ?? '0'
		)
	}

	async invalidateCallKentCaches() {
		const episodesCacheGeneration = Date.now().toString()
		await this.env.CONTENT_KV.put(
			callKentEpisodesCacheGenerationKey,
			episodesCacheGeneration,
		)
		const pageCacheGeneration = await bumpPageCacheGeneration(
			this.env.CONTENT_KV,
		)
		return { episodesCacheGeneration, pageCacheGeneration }
	}
}
