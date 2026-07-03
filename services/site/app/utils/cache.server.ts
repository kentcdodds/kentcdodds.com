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
	getRuntimeBinding,
	hasAppDbBinding,
} from '#app/utils/runtime-bindings.server.ts'
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

type DatabaseSync = import('node:sqlite').DatabaseSync
type StatementSync = ReturnType<DatabaseSync['prepare']>

type SqliteCacheState = {
	db: DatabaseSync
	preparedGet: StatementSync
	preparedSet: StatementSync
	preparedDelete: StatementSync
	preparedAllKeys: StatementSync
	preparedKeySearch: StatementSync
}

const sqliteCacheStates = remember(
	'sqlite-cache-states',
	() => new Map<string, Promise<SqliteCacheState>>(),
)

function getCacheDatabasePath() {
	const cacheDatabasePath = getRuntimeBinding<string>(
		'CACHE_DATABASE_PATH',
	)?.trim()
	if (cacheDatabasePath) return cacheDatabasePath
	throw new Error(
		'CACHE_DATABASE_PATH is required for the SQLite cache backend',
	)
}

export async function getCacheDb() {
	return (await getSqliteCacheState()).db
}

async function createDatabase(
	cacheDatabasePath: string,
	tryAgain = true,
): Promise<DatabaseSync> {
	const fs = await import('node:fs')
	const path = await import('node:path')
	const { DatabaseSync } = await import('node:sqlite')
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
			return createDatabase(cacheDatabasePath, false)
		}
		throw error
	}
	return db
}

function getSqliteCacheState() {
	const cacheDatabasePath = getCacheDatabasePath()
	let state = sqliteCacheStates.get(cacheDatabasePath)
	if (!state) {
		state = createSqliteCacheState(cacheDatabasePath)
		sqliteCacheStates.set(cacheDatabasePath, state)
	}
	return state
}

async function createSqliteCacheState(cacheDatabasePath: string) {
	const db = await createDatabase(cacheDatabasePath)
	return {
		db,
		preparedGet: db.prepare('SELECT value, metadata FROM cache WHERE key = ?'),
		preparedSet: db.prepare(
			'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (?, ?, ?)',
		),
		preparedDelete: db.prepare('DELETE FROM cache WHERE key = ?'),
		preparedAllKeys: db.prepare('SELECT key FROM cache LIMIT ?'),
		preparedKeySearch: db.prepare(
			'SELECT key FROM cache WHERE key LIKE ? LIMIT ?',
		),
	}
}

const LRU_MAX_ENTRIES = 500

const lruInstance = remember(
	'lru-cache',
	() => new LRUCache<string, CacheEntry<unknown>>({ max: LRU_MAX_ENTRIES }),
)

export type CacheRequestStats = {
	lruHits: number
	rpcCalls: number
	rpcMs: number
}

let activeCacheStats: CacheRequestStats | null = null

export function beginCacheRequestStats(): CacheRequestStats {
	const stats = { lruHits: 0, rpcCalls: 0, rpcMs: 0 }
	activeCacheStats = stats
	return stats
}

export function endCacheRequestStats() {
	activeCacheStats = null
}

export function formatCacheRequestStatsHeader(stats: CacheRequestStats) {
	return `lru_hits=${stats.lruHits},rpc_calls=${stats.rpcCalls},rpc_ms=${stats.rpcMs.toFixed(1)}`
}

export function isFileCacheAvailable() {
	return !hasAppDbBinding() && !getCacheRpcBinding()
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

const getBuffer = () => (globalThis as { Buffer?: typeof Buffer }).Buffer

const isBuffer = (obj: unknown) =>
	getBuffer()?.isBuffer(obj) || obj instanceof Uint8Array

function bufferReplacer(_key: string, value: unknown) {
	if (isBuffer(value)) {
		const BufferConstructor = getBuffer()
		if (!BufferConstructor) return value
		return {
			__isBuffer: true,
			data: BufferConstructor.from(value).toString('base64'),
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
		const BufferConstructor = getBuffer()
		if (!BufferConstructor) return value
		return BufferConstructor.from((value as any).data, 'base64')
	}
	return value
}

export const cache: CachifiedCache = {
	name: 'Application cache',
	async get(key) {
		const rpc = getCacheRpcBinding()
		if (rpc) {
			const lruHit = lruCache.get(key)
			if (lruHit) {
				if (activeCacheStats) activeCacheStats.lruHits++
				return lruHit
			}
			const rpcStart = performance.now()
			const entry = await rpc.get(key)
			if (activeCacheStats) {
				activeCacheStats.rpcCalls++
				activeCacheStats.rpcMs += performance.now() - rpcStart
			}
			if (entry) lruCache.set(key, entry)
			return entry
		}
		if (hasAppDbBinding()) return lruCache.get(key) ?? null
		const { preparedGet } = await getSqliteCacheState()
		const result = preparedGet.get(key) as any
		if (!result) return null
		return {
			metadata: JSON.parse(result.metadata),
			value: JSON.parse(result.value, bufferReviver),
		}
	},
	async set(key, entry) {
		const rpc = getCacheRpcBinding()
		if (rpc) {
			lruCache.set(key, entry)
			await rpc.set(key, entry)
			return
		}
		if (hasAppDbBinding()) {
			lruCache.set(key, entry)
			return
		}
		const { preparedSet } = await getSqliteCacheState()
		preparedSet.run(
			key,
			JSON.stringify(entry.value, bufferReplacer),
			JSON.stringify(entry.metadata),
		)
	},
	async delete(key) {
		const rpc = getCacheRpcBinding()
		if (rpc) {
			lruCache.delete(key)
			await rpc.delete(key)
			return
		}
		if (hasAppDbBinding()) {
			lruCache.delete(key)
			return
		}
		const { preparedDelete } = await getSqliteCacheState()
		preparedDelete.run(key)
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
	const sqlite = hasAppDbBinding()
		? []
		: (await getSqliteCacheState()).preparedAllKeys
				.all(limit)
				.map((row) => (row as { key: string }).key)
	return {
		sqlite,
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
	const sqlite = hasAppDbBinding()
		? []
		: (await getSqliteCacheState()).preparedKeySearch
				.all(`%${search}%`, limit)
				.map((row) => (row as { key: string }).key)
	return {
		sqlite,
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
