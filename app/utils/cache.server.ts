import LRU from 'lru-cache'
import type {Cache as CachifiedCache, CacheEntry} from 'cachified'
import {lruCacheAdapter} from 'cachified'
import {getUser} from './session.server'
import {prisma} from './prisma.server'

declare global {
  // This preserves the LRU cache during development
  // eslint-disable-next-line
  var __lruCache: LRU<string, CacheEntry<unknown>> | undefined
}

const lru = (global.__lruCache = global.__lruCache
  ? global.__lruCache
  : new LRU<string, CacheEntry<unknown>>({max: 1000}))

export const lruCache = lruCacheAdapter(lru)

export const cache: CachifiedCache = {
  name: 'SQLite cache',
  async get(key) {
    const result = await prisma.cache.findUnique({
      where: {key},
      select: {value: true, metadata: true},
    })
    if (!result) return null
    return {
      metadata: JSON.parse(result.metadata),
      value: JSON.parse(result.value),
    }
  },
  async set(key, {value, metadata}) {
    const data = {
      key,
      value: JSON.stringify(value),
      metadata: JSON.stringify(metadata),
    }
    await prisma.cache.upsert({
      where: {key},
      create: data,
      update: data,
    })
  },
  async delete(key) {
    // we don't care if the key didn't already exist
    await prisma.cache.delete({where: {key}}).catch(() => {})
  },
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
