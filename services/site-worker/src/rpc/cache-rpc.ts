import { WorkerEntrypoint } from 'cloudflare:workers'
import type { CacheEntry } from '@epic-web/cachified'
import {
	decodeCacheEntry,
	encodeCacheEntry,
	getKvExpirationTtl,
} from '../cache-encoding.ts'
import type { ParentWorkerEnv } from './types.ts'

const KV_VALUE_PREFIX = 'cache:value:'
const KV_METADATA_PREFIX = 'cache:metadata:'

export class CacheRpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async get(key: string) {
		const [valueRaw, metadataRaw] = await Promise.all([
			this.env.SITE_CACHE_KV.get(`${KV_VALUE_PREFIX}${key}`),
			this.env.SITE_CACHE_KV.get(`${KV_METADATA_PREFIX}${key}`),
		])

		if (!valueRaw || !metadataRaw) return null

		return decodeCacheEntry({ value: valueRaw, metadata: metadataRaw })
	}

	async set(key: string, entry: CacheEntry<unknown>) {
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
}
