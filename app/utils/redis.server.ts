import redis from 'redis'
import type {Request} from '~/types'
import type {Timings} from './metrics.server'
import {time} from './metrics.server'
import {getErrorMessage, getRequiredServerEnvVar} from './misc'
import {getUser} from './session.server'

declare global {
  // This prevents us from making multiple connections to the db when the
  // require cache is cleared.
  // eslint-disable-next-line
  var replicaClient: redis.RedisClient | undefined,
    primaryClient: redis.RedisClient | undefined
}

const REDIS_URL = getRequiredServerEnvVar('REDIS_URL')
const replica = new URL(REDIS_URL)
const isLocalHost = replica.hostname === 'localhost'
const isInternal = replica.hostname.includes('.internal')

const isMultiRegion = !isLocalHost && isInternal

const PRIMARY_REGION = isMultiRegion
  ? getRequiredServerEnvVar('PRIMARY_REGION')
  : null
const FLY_REGION = isMultiRegion ? getRequiredServerEnvVar('FLY_REGION') : null

if (FLY_REGION) {
  replica.host = `${FLY_REGION}.${replica.host}`
}

const replicaClient = createClient('replicaClient', {
  url: replica.toString(),
  family: isInternal ? 'IPv6' : 'IPv4',
})

let primaryClient: redis.RedisClient | null = null
if (FLY_REGION !== PRIMARY_REGION) {
  const primary = new URL(REDIS_URL)
  if (!isLocalHost) {
    primary.host = `${PRIMARY_REGION}.${primary.host}`
  }
  primaryClient = createClient('primaryClient', {
    url: primary.toString(),
    family: isInternal ? 'IPv6' : 'IPv4',
  })
}

function createClient(
  name: 'replicaClient' | 'primaryClient',
  options: redis.ClientOpts,
): redis.RedisClient {
  let client = global[name]
  if (!client) {
    const url = new URL(options.url ?? 'http://no-redis-url.example.com?weird')
    // eslint-disable-next-line no-multi-assign
    client = global[name] = redis.createClient(options)

    client.on('error', (error: string) => {
      console.error(`REDIS ${name} (${url.host}) ERROR:`, error)
    })
  }
  return client
}

// NOTE: Caching should never crash the app, so instead of rejecting all these
// promises, we'll just resolve things with null and log the error.

function get(key: string): Promise<string | null> {
  return new Promise(resolve => {
    replicaClient.get(key, (err: Error | null, result: string | null) => {
      if (err)
        console.error(
          `REDIS replicaClient (${FLY_REGION}) ERROR with .get:`,
          err,
        )
      resolve(result)
    })
  })
}

function set(key: string, value: string): Promise<'OK'> {
  return new Promise(resolve => {
    replicaClient.set(key, value, (err: Error | null, reply: 'OK') => {
      if (err)
        console.error(
          `REDIS replicaClient (${FLY_REGION}) ERROR with .set:`,
          err,
        )
      resolve(reply)
    })
  })
}

function del(key: string): Promise<string> {
  return new Promise(resolve => {
    // fire and forget on primary, we only care about replica
    primaryClient?.del(key, (err: Error | null) => {
      if (err) {
        console.error('Primary delete error', err)
      }
    })
    replicaClient.del(key, (err: Error | null, result: number | null) => {
      if (err) {
        console.error(
          `REDIS replicaClient (${FLY_REGION}) ERROR with .del:`,
          err,
        )
        resolve('error')
      } else {
        resolve(`${key} deleted: ${result}`)
      }
    })
  })
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

async function cachified<ReturnValue>(options: {
  key: string
  getFreshValue: () => Promise<ReturnValue>
  checkValue?: (value: ReturnValue) => boolean
  forceFresh?: boolean
  request?: Request
  fallbackToCache?: boolean
  timings?: Timings
  timingType?: string
  maxAge?: number
  expires?: Date
}): Promise<ReturnValue> {
  const {
    key,
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

  if (!forceFresh) {
    try {
      const cached = await time({
        name: `redis.get(${key})`,
        type: 'redis cache read',
        fn: () => get(key),
        timings,
      })
      if (cached) {
        const cachedParsed = JSON.parse(cached) as {
          metadata?: CacheMetadata
          value?: ReturnValue
        }
        if (cachedParsed.metadata && shouldRefresh(cachedParsed.metadata)) {
          // time to refresh the value. Fire and forget so we don't slow down
          // this request
          // originally I thought it may be good to make sure we don't have
          // multiple requests for the same key triggering multiple refreshes
          // like this, but as I thought about it I realized the liklihood of
          // this causing real issues is pretty small (unless there's a failure)
          // to update the value, in which case we should probably be notified
          // anyway...
          void cachified({...options, forceFresh: true})
        }
        if (cachedParsed.value && checkValue(cachedParsed.value)) {
          return cachedParsed.value
        } else {
          console.warn(
            `check failed for cached value of ${key}. Deleting the cache key and trying to get a fresh value.`,
            cachedParsed,
          )
          await del(key)
        }
      }
    } catch (error: unknown) {
      console.error(`error with cache at ${key}`, getErrorMessage(error))
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
    void set(key, JSON.stringify({metadata, value})).catch(error => {
      console.error(`error setting redis.${key}`, getErrorMessage(error))
    })
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

export {get, set, del, cachified, shouldForceFresh}
