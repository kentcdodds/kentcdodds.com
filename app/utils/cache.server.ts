import fs from 'fs'
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
import Database, { type default as BetterSqlite3 } from 'better-sqlite3'
import { getInstanceInfo, getInstanceInfoSync } from 'litefs-js'
import { LRUCache } from 'lru-cache'
import { getRequiredServerEnvVar } from './misc.tsx'
import { getUser } from './session.server.ts'
import { time, type Timings } from './timing.server.ts'
import { updatePrimaryCacheValue } from '~/routes/resources+/cache.sqlite.ts'

const CACHE_DATABASE_PATH = getRequiredServerEnvVar('CACHE_DATABASE_PATH')

const cacheDb = remember('cacheDb', createDatabase)

function createDatabase(tryAgain = true): BetterSqlite3.Database {
	const db = new Database(CACHE_DATABASE_PATH)
	const { currentIsPrimary } = getInstanceInfoSync()
	if (!currentIsPrimary) return db

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
		fs.unlinkSync(CACHE_DATABASE_PATH)
		if (tryAgain) {
			console.error(
				`Error creating cache database, deleting the file at "${CACHE_DATABASE_PATH}" and trying again...`,
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

const preparedGet = cacheDb.prepare(
	'SELECT value, metadata FROM cache WHERE key = ?',
)
const preparedSet = cacheDb.prepare(
	'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (@key, @value, @metadata)',
)
const preparedDelete = cacheDb.prepare('DELETE FROM cache WHERE key = ?')

export const cache: CachifiedCache = {
	name: 'SQLite cache',
	get(key) {
		const result = preparedGet.get(key) as any // TODO: fix this with zod or something
		if (!result) return null
		return {
			metadata: JSON.parse(result.metadata),
			value: JSON.parse(result.value),
		}
	},
	async set(key, entry) {
		const { currentIsPrimary, primaryInstance } = await getInstanceInfo()
		if (currentIsPrimary) {
			preparedSet.run({
				key,
				value: JSON.stringify(entry.value),
				metadata: JSON.stringify(entry.metadata),
			})
		} else {
			// fire-and-forget cache update
			void updatePrimaryCacheValue!({
				key,
				cacheValue: entry,
			}).then((response) => {
				if (!response.ok) {
					console.error(
						`Error updating cache value for key "${key}" on primary instance (${primaryInstance}): ${response.status} ${response.statusText}`,
						{ entry },
					)
				}
			})
		}
	},
	async delete(key) {
		const { currentIsPrimary, primaryInstance } = await getInstanceInfo()
		if (currentIsPrimary) {
			preparedDelete.run(key)
		} else {
			// fire-and-forget cache update
			void updatePrimaryCacheValue!({
				key,
				cacheValue: undefined,
			}).then((response) => {
				if (!response.ok) {
					console.error(
						`Error deleting cache value for key "${key}" on primary instance (${primaryInstance}): ${response.status} ${response.statusText}`,
					)
				}
			})
		}
	},
}

const preparedAllKeys = cacheDb.prepare('SELECT key FROM cache LIMIT ?')
export async function getAllCacheKeys(limit: number) {
	return {
		sqlite: preparedAllKeys
			.all(limit)
			.map((row) => (row as { key: string }).key),
		lru: [...lruInstance.keys()],
	}
}

const preparedKeySearch = cacheDb.prepare(
	'SELECT key FROM cache WHERE key LIKE ? LIMIT ?',
)
export async function searchCacheKeys(search: string, limit: number) {
	return {
		sqlite: preparedKeySearch
			.all(`%${search}%`, limit)
			.map((row) => (row as { key: string }).key),
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
