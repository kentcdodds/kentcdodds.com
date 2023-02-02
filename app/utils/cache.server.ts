import LRU from 'lru-cache'
import fs from 'fs'
import type {Cache as CachifiedCache, CacheEntry} from 'cachified'
import {verboseReporter, lruCacheAdapter} from 'cachified'
import * as C from 'cachified'
import type BetterSqlite3 from 'better-sqlite3'
import Database from 'better-sqlite3'
import {getUser} from './session.server'
import {getRequiredServerEnvVar} from './misc'
import type {Timings} from './timing.server'
import {time} from './timing.server'
import {updatePrimaryCacheValue} from '~/routes/resources/cache.sqlite'
import {getInstanceInfo, getInstanceInfoSync} from 'litefs-js'

const CACHE_DATABASE_PATH = getRequiredServerEnvVar('CACHE_DATABASE_PATH')

declare global {
  // This preserves the LRU cache during development
  // eslint-disable-next-line
  var __lruCache: LRU<string, CacheEntry<unknown>> | undefined,
    __cacheDb: ReturnType<typeof Database> | undefined
}

const cacheDb = (global.__cacheDb = global.__cacheDb
  ? global.__cacheDb
  : createDatabase())

function createDatabase(tryAgain = true): BetterSqlite3.Database {
  const db = new Database(CACHE_DATABASE_PATH)
  const {currentIsPrimary} = getInstanceInfoSync()
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

const lru = (global.__lruCache = global.__lruCache
  ? global.__lruCache
  : new LRU<string, CacheEntry<unknown>>({max: 5000}))

export const lruCache = lruCacheAdapter(lru)

export const cache: CachifiedCache = {
  name: 'SQLite cache',
  get(key) {
    const result = cacheDb
      .prepare('SELECT value, metadata FROM cache WHERE key = ?')
      .get(key)
    if (!result) return null
    return {
      metadata: JSON.parse(result.metadata),
      value: JSON.parse(result.value),
    }
  },
  async set(key, entry) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const {currentIsPrimary, primaryInstance} = await getInstanceInfo()
    if (currentIsPrimary) {
      cacheDb
        .prepare(
          'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (@key, @value, @metadata)',
        )
        .run({
          key,
          value: JSON.stringify(entry.value),
          metadata: JSON.stringify(entry.metadata),
        })
    } else {
      // fire-and-forget cache update
      void updatePrimaryCacheValue({
        key,
        cacheValue: entry,
      }).then(response => {
        if (!response.ok) {
          console.error(
            `Error updating cache value for key "${key}" on primary instance (${primaryInstance}): ${response.status} ${response.statusText}`,
            {entry},
          )
        }
      })
    }
  },
  async delete(key) {
    const {currentIsPrimary, primaryInstance} = await getInstanceInfo()
    if (currentIsPrimary) {
      cacheDb.prepare('DELETE FROM cache WHERE key = ?').run(key)
    } else {
      // fire-and-forget cache update
      void updatePrimaryCacheValue({
        key,
        cacheValue: undefined,
      }).then(response => {
        if (!response.ok) {
          console.error(
            `Error deleting cache value for key "${key}" on primary instance (${primaryInstance}): ${response.status} ${response.statusText}`,
          )
        }
      })
    }
  },
}

export async function getAllCacheKeys(limit: number) {
  return {
    sqlite: cacheDb
      .prepare('SELECT key FROM cache LIMIT ?')
      .all(limit)
      .map(row => row.key),
    lru: [...lru.keys()],
  }
}

export async function searchCacheKeys(search: string, limit: number) {
  return {
    sqlite: cacheDb
      .prepare('SELECT key FROM cache WHERE key LIKE ? LIMIT ?')
      .all(`%${search}%`, limit)
      .map(row => row.key),
    lru: [...lru.keys()].filter(key => key.includes(search)),
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
}: Omit<C.CachifiedOptions<Value>, 'forceFresh'> & {
  request?: Request
  timings?: Timings
  forceFresh?: boolean | string
}): Promise<Value> {
  let cachifiedResolved = false
  const cachifiedPromise = C.cachified({
    reporter: verboseReporter(),
    ...options,
    forceFresh: await shouldForceFresh({
      forceFresh: options.forceFresh,
      request,
      key: options.key,
    }),
    getFreshValue: async context => {
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
  })
  const result = await time(cachifiedPromise, {
    timings,
    type: `cache:${options.key}`,
    desc: `${options.key} cache retrieval`,
  })
  cachifiedResolved = true
  return result
}

/*
eslint
  max-depth: "off",
  no-multi-assign: "off",
  @typescript-eslint/no-explicit-any: "off",
*/
