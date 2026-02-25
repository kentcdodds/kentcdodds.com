import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
	type Cache,
	cachified as baseCachified,
	verboseReporter,
	type CacheEntry,
	type Cache as CachifiedCache,
	type CachifiedOptions,
	totalTtl,
} from '@epic-web/cachified'
import { remember } from '@epic-web/remember'
import { LRUCache } from 'lru-cache'
import { getEnv } from '#app/utils/env.server.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import { isUserAdmin } from './authorization.server.ts'
import { getUser } from './session.server.ts'
import { time, type Timings } from './timing.server.ts'

const cacheDb = remember('cacheDb', createDatabase)

function createDatabase(tryAgain = true): DatabaseSync {
	const cacheDatabasePath = getEnv().CACHE_DATABASE_PATH
	const parentDir = path.dirname(cacheDatabasePath)
	fs.mkdirSync(parentDir, { recursive: true })
	const db = new DatabaseSync(cacheDatabasePath)
	try {
		// create cache table with metadata JSON column and value JSON column if it does not exist already
		db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        metadata TEXT,
        value TEXT
      )
    `)
	} catch (error: unknown) {
		fs.unlinkSync(cacheDatabasePath)
		if (tryAgain) {
			console.error(
				`Error creating cache database, deleting the file at "${cacheDatabasePath}" and trying again...`,
			)
			return createDatabase(false)
		}
		throw error
	}
	return db
}

const lruInstance = remember(
	'lru-cache',
	() => new LRUCache<string, CacheEntry<unknown>>({ max: 5000 }),
)

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

const isBuffer = (obj: unknown): obj is Buffer =>
	Buffer.isBuffer(obj) || obj instanceof Uint8Array

function bufferReplacer(_key: string, value: unknown) {
	if (isBuffer(value)) {
		return {
			__isBuffer: true,
			data: value.toString('base64'),
		}
	}
	return value
}

function bufferReviver(_key: string, value: unknown) {
	if (
		value &&
		typeof value === 'object' &&
		'__isBuffer' in value &&
		(value as any).data
	) {
		return Buffer.from((value as any).data, 'base64')
	}
	return value
}

const preparedGet = cacheDb.prepare(
	'SELECT value, metadata FROM cache WHERE key = ?',
)
const preparedSet = cacheDb.prepare(
	'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (?, ?, ?)',
)
const preparedDelete = cacheDb.prepare('DELETE FROM cache WHERE key = ?')

type KvNamespaceLike = {
	get: (
		key: string,
		type: 'text',
	) => Promise<string | null> | string | null
	put: (key: string, value: string) => Promise<void> | void
	delete: (key: string) => Promise<void> | void
	list: (options?: {
		prefix?: string
		limit?: number
		cursor?: string
	}) => Promise<{ keys: Array<{ name: string }>; cursor?: string }>
}

const KV_CACHE_PREFIX = 'site-cache:'

function getCacheKvNamespace() {
	return getRuntimeBinding<KvNamespaceLike>('SITE_CACHE_KV')
}

function toKvCacheKey(key: string) {
	return `${KV_CACHE_PREFIX}${key}`
}

export const cache: CachifiedCache = {
	name: 'Shared cache',
	async get(key) {
		const kvNamespace = getCacheKvNamespace()
		if (kvNamespace) {
			const value = await kvNamespace.get(toKvCacheKey(key), 'text')
			return value ? JSON.parse(value, bufferReviver) : null
		}
		const result = preparedGet.get(key) as any
		if (!result) return null
		return {
			metadata: JSON.parse(result.metadata),
			value: JSON.parse(result.value, bufferReviver),
		}
	},
	async set(key, entry) {
		const kvNamespace = getCacheKvNamespace()
		if (kvNamespace) {
			await kvNamespace.put(
				toKvCacheKey(key),
				JSON.stringify(entry, bufferReplacer),
			)
			return
		}
		preparedSet.run(
			key,
			JSON.stringify(entry.value, bufferReplacer),
			JSON.stringify(entry.metadata),
		)
	},
	async delete(key) {
		const kvNamespace = getCacheKvNamespace()
		if (kvNamespace) {
			await kvNamespace.delete(toKvCacheKey(key))
		} else {
			preparedDelete.run(key)
		}
	},
}

async function listKvCacheKeys(limit: number) {
	const kvNamespace = getCacheKvNamespace()
	if (!kvNamespace) return []
	const result = await kvNamespace.list({
		prefix: KV_CACHE_PREFIX,
		limit,
	})
	return result.keys.map((entry) => entry.name.slice(KV_CACHE_PREFIX.length))
}

export async function getAllCacheKeys(limit: number) {
	const kvKeys = await listKvCacheKeys(limit)
	return {
		shared: kvKeys.length
			? kvKeys
			: preparedAllKeys.all(limit).map((row) => (row as { key: string }).key),
		lru: [...lruInstance.keys()],
	}
}

export async function searchCacheKeys(search: string, limit: number) {
	const kvNamespace = getCacheKvNamespace()
	if (kvNamespace) {
		const keys = await listKvCacheKeys(Math.max(limit * 5, limit))
		return {
			shared: keys.filter((key) => key.includes(search)).slice(0, limit),
			lru: [...lruInstance.keys()].filter((key) => key.includes(search)),
		}
	}

	return {
		shared: preparedKeySearch
			.all(`%${search}%`, limit)
			.map((row) => (row as { key: string }).key),
		lru: [...lruInstance.keys()].filter((key) => key.includes(search)),
	}
}

const preparedAllKeys = cacheDb.prepare('SELECT key FROM cache LIMIT ?')
const preparedKeySearch = cacheDb.prepare(
	'SELECT key FROM cache WHERE key LIKE ? LIMIT ?',
)

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
	if (!isUserAdmin(await getUser(request))) return false
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
		verboseReporter(),
	)
	const result = await time(cachifiedPromise, {
		timings,
		type: `cache:${options.key}`,
		desc: `${options.key} cache retrieval`,
	})
	cachifiedResolved = true
	return result
}
