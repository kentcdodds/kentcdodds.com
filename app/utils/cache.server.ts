import LRU from 'lru-cache'
import type {Request} from '~/types'
import type {Timings} from './metrics.server'
import {time} from './metrics.server'
import {getErrorMessage} from './misc'
import {getUser} from './session.server'

declare global {
  // This preserves the LRU cache during development
  // eslint-disable-next-line
  var lruCache: LRU<string, {metadata: CacheMetadata; value: any}> | undefined
}

const lruCache =
  // eslint-disable-next-line no-multi-assign
  (global.lruCache = global.lruCache
    ? global.lruCache
    : // doing anything other than "any" here was a big pain
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new LRU<string, {metadata: CacheMetadata; value: any}>({
        max: 1000,
        maxAge: 1000 * 60 * 60, // 1 hour
      }))

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

async function cachified<
  Value,
  Cache extends {
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
          // originally I thought it may be good to make sure we don't have
          // multiple requests for the same key triggering multiple refreshes
          // like this, but as I thought about it I realized the liklihood of
          // this causing real issues is pretty small (unless there's a failure)
          // to update the value, in which case we should probably be notified
          // anyway...
          // we use Promise.resolve here to make sure this happens on the next tick
          // of the event loop so we don't end up slowing this request down in the
          // event the cache is synchronous (unlikely now, but if the code is changed
          // then it's quite possible this could happen and it would be easy to
          // forget to check).
          void Promise.resolve().then(() =>
            // eslint-disable-next-line prefer-object-spread
            cachified(Object.assign({}, options, {forceFresh: true})),
          )
        }
        if (cached.value && checkValue(cached.value)) {
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
        getErrorMessage(error),
      )
      await cache.del(key)
    }
  }

  const value = await time({
    name: `getFreshValue for ${key}`,
    type: timingType,
    fn: getFreshValue,
    timings,
  }).catch((error: unknown) => {
    // If we got this far without forceFresh then we know there's nothing
    // in the cache so no need to bother. So we need both the option to fallback
    // and the ability.
    if (fallbackToCache && forceFresh) {
      return cachified({...options, forceFresh: false})
    } else {
      throw error
    }
  })

  if (checkValue(value)) {
    const metadata: CacheMetadata = {
      maxAge: maxAge ?? null,
      expires: expires?.getTime() ?? null,
      createdTime: Date.now(),
    }
    try {
      await cache.set(key, {metadata, value})
    } catch (error: unknown) {
      console.error(`error setting cache.${key}`, getErrorMessage(error))
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
