import LRU from 'lru-cache'
import {formatDuration, intervalToDuration} from 'date-fns'
import type {Timings} from './metrics.server'
import {time} from './metrics.server'
import {getUser} from './session.server'

function niceFormatDuration(milliseconds: number) {
  const duration = intervalToDuration({start: 0, end: milliseconds})
  const formatted = formatDuration(duration, {delimiter: ', '})
  const ms = milliseconds % 1000
  return [formatted, ms ? `${ms.toFixed(2)}ms` : null]
    .filter(Boolean)
    .join(', ')
}

declare global {
  // This preserves the LRU cache during development
  // eslint-disable-next-line
  var lruCache:
    | (LRU<string, {metadata: CacheMetadata; value: any}> & {name: string})
    | undefined
}

const lruCache = (global.lruCache = global.lruCache
  ? global.lruCache
  : createLruCache())

function createLruCache() {
  // doing anything other than "any" here was a big pain
  const newCache = new LRU<string, {metadata: CacheMetadata; value: any}>({
    max: 1000,
    maxAge: 1000 * 60 * 60, // 1 hour
  })
  Object.assign(newCache, {name: 'LRU'})
  return newCache as typeof newCache & {name: 'LRU'}
}

type CacheMetadata = {
  createdTime: number
  maxAge: number | null
  expires: number | null
}

function shouldRefresh(metadata: CacheMetadata) {
  if (metadata.maxAge) {
    return Date.now() > metadata.createdTime + metadata.maxAge
  }
  if (metadata.expires) {
    return Date.now() > metadata.expires
  }
  return false
}

type VNUP<Value> = Value | null | undefined | Promise<Value | null | undefined>

const keysRefreshing = new Set()

async function cachified<
  Value,
  Cache extends {
    name: string
    get: (key: string) => VNUP<{
      metadata: CacheMetadata
      value: Value
    }>
    set: (
      key: string,
      value: {
        metadata: CacheMetadata
        value: Value
      },
    ) => unknown | Promise<unknown>
    del: (key: string) => unknown | Promise<unknown>
  },
>(options: {
  key: string
  cache: Cache
  getFreshValue: () => Promise<Value>
  checkValue?: (value: Value) => boolean
  forceFresh?: boolean
  request?: Request
  fallbackToCache?: boolean
  timings?: Timings
  timingType?: string
  maxAge?: number
  expires?: Date
}): Promise<Value> {
  const {
    key,
    cache,
    getFreshValue,
    request,
    forceFresh = request ? await shouldForceFresh(request) : false,
    checkValue = value => Boolean(value),
    fallbackToCache = true,
    timings,
    timingType = 'getting fresh value',
    maxAge,
    expires,
  } = options

  function assertCacheEntry(entry: unknown): asserts entry is {
    metadata: CacheMetadata
    value: Value
  } {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(
        `Cache entry for ${key} is not a cache entry object, it's a ${typeof entry}`,
      )
    }
    if (!('metadata' in entry)) {
      throw new Error(
        `Cache entry for ${key} does not have a metadata property`,
      )
    }
    if (!('value' in entry)) {
      throw new Error(`Cache entry for ${key} does not have a value property`)
    }
  }

  if (!forceFresh) {
    try {
      const cached = await time({
        name: `cache.get(${key})`,
        type: 'cache read',
        fn: () => cache.get(key),
        timings,
      })
      if (cached) {
        assertCacheEntry(cached)

        if (shouldRefresh(cached.metadata)) {
          // time to refresh the value. Fire and forget so we don't slow down
          // this request
          // we use setTimeout here to make sure this happens on the next tick
          // of the event loop so we don't end up slowing this request down in the
          // event the cache is synchronous (unlikely now, but if the code is changed
          // then it's quite possible this could happen and it would be easy to
          // forget to check).
          // In practice we have had a handful of situations where multiple
          // requests triggered a refresh of the same resource, so that's what
          // the keysRefreshing thing is for to ensure we don't refresh a
          // value if it's already in the process of being refreshed.
          if (!keysRefreshing.has(key)) {
            keysRefreshing.add(key)
            setTimeout(() => {
              // eslint-disable-next-line prefer-object-spread
              void cachified(Object.assign({}, options, {forceFresh: true}))
                .catch(() => {})
                .finally(() => {
                  keysRefreshing.delete(key)
                })
            }, 200)
          }
        }
        if (cached.value != null && checkValue(cached.value)) {
          return cached.value
        } else {
          console.warn(
            `check failed for cached value of ${key}. Deleting the cache key and trying to get a fresh value.`,
            cached,
          )
          await cache.del(key)
        }
      }
    } catch (error: unknown) {
      console.error(
        `error with cache at ${key}. Deleting the cache key and trying to get a fresh value.`,
        error,
      )
      await cache.del(key)
    }
  }

  const start = performance.now()
  const value = await time({
    name: `getFreshValue for ${key}`,
    type: timingType,
    fn: getFreshValue,
    timings,
  }).catch((error: unknown) => {
    // If we got this far without forceFresh then we know there's nothing
    // in the cache so no need to bother trying again without a forceFresh.
    // So we need both the option to fallback and the ability to fallback.
    if (fallbackToCache && forceFresh) {
      return cachified({...options, forceFresh: false})
    } else {
      console.error(
        `getting a fresh value for ${key} failed`,
        {fallbackToCache, forceFresh},
        error,
      )
      throw error
    }
  })
  const totalTime = performance.now() - start

  if (checkValue(value)) {
    const metadata: CacheMetadata = {
      maxAge: maxAge ?? null,
      expires: expires?.getTime() ?? null,
      createdTime: Date.now(),
    }
    try {
      console.log(
        `Updating the cache value for ${key}.`,
        `Getting a fresh value for this took ${niceFormatDuration(totalTime)}.`,
        `Caching for a minimum of ${
          typeof maxAge === 'number'
            ? `${niceFormatDuration(maxAge)}`
            : 'forever'
        } in ${cache.name}.`,
      )
      await cache.set(key, {metadata, value})
    } catch (error: unknown) {
      console.error(`error setting cache: ${key}`, error)
    }
  } else {
    console.error(`check failed for fresh value of ${key}:`, value)
    throw new Error(`check failed for fresh value of ${key}`)
  }
  return value
}

async function shouldForceFresh(request: Request) {
  return (
    new URL(request.url).searchParams.has('fresh') &&
    (await getUser(request))?.role === 'ADMIN'
  )
}

export {cachified, lruCache}

/*
eslint
  max-depth: "off",
  no-multi-assign: "off",
  @typescript-eslint/no-explicit-any: "off",
*/
