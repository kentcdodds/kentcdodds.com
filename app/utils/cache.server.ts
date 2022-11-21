import LRU from 'lru-cache'
import type {Cache as CachifiedCache, CacheEntry} from 'cachified'
import {lruCacheAdapter} from 'cachified'
import Database from 'better-sqlite3'
import {getUser} from './session.server'
import {getRequiredServerEnvVar} from './misc'

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

function createDatabase() {
  const db = new Database(CACHE_DATABASE_PATH)
  // create cache table with metadata JSON column and value JSON column if it does not exist already
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      metadata TEXT,
      value TEXT
    )
  `)
  return db
}

const lru = (global.__lruCache = global.__lruCache
  ? global.__lruCache
  : new LRU<string, CacheEntry<unknown>>({max: 1000}))

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
  set(key, {value, metadata}) {
    cacheDb
      .prepare(
        'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (@key, @value, @metadata)',
      )
      .run({
        key,
        value: JSON.stringify(value),
        metadata: JSON.stringify(metadata),
      })
  },
  async delete(key) {
    cacheDb.prepare('DELETE FROM cache WHERE key = ?').run(key)
  },
}

export async function getAllCacheKeys(limit: number) {
  return cacheDb
    .prepare('SELECT key FROM cache LIMIT ?')
    .all(limit)
    .map(row => row.key)
}

export async function searchCacheKeys(search: string, limit: number) {
  return cacheDb
    .prepare('SELECT key FROM cache WHERE key LIKE ? LIMIT ?')
    .all(`%${search}%`, limit)
    .map(row => row.key)
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

/*
eslint
  max-depth: "off",
  no-multi-assign: "off",
  @typescript-eslint/no-explicit-any: "off",
*/
