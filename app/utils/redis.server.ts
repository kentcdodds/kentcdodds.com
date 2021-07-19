import redis from 'redis'
import {getRequiredServerEnvVar} from './misc'

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

const PRIMARY_REGION = isLocalHost
  ? null
  : getRequiredServerEnvVar('PRIMARY_REGION')
const FLY_REGION = isLocalHost ? null : getRequiredServerEnvVar('FLY_REGION')

if (!isLocalHost) {
  replica.host = `${FLY_REGION}.${replica.host}`
}

const replicaClient = createClient('replicaClient', {
  url: replica.toString(),
  family: 'IPv6',
})

let primaryClient: redis.RedisClient | null = null
if (FLY_REGION !== PRIMARY_REGION) {
  const primary = new URL(REDIS_URL)
  if (!isLocalHost) {
    primary.host = `${PRIMARY_REGION}.${primary.host}`
  }
  primaryClient = createClient('primaryClient', {
    url: primary.toString(),
    family: 'IPv6',
  })
}

function createClient(
  name: 'replicaClient' | 'primaryClient',
  options: redis.ClientOpts,
): redis.RedisClient {
  let client = global[name]
  if (!client) {
    // eslint-disable-next-line no-multi-assign
    client = global[name] = redis.createClient(options)

    client.on('error', (error: string) => {
      console.error(`REDIS ${name} (${PRIMARY_REGION}) ERROR:`, error)
    })
  }
  return client
}

function get(key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    replicaClient.get(key, (err: Error | null, result: string | null) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

function set(key: string, value: string): Promise<'OK'> {
  return new Promise((resolve, reject) => {
    replicaClient.set(key, value, (err: Error | null, reply: 'OK') => {
      if (err) return reject(err)
      resolve(reply)
    })
  })
}

function del(key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // fire and forget on primary, we only care about replica
    primaryClient?.del(key, (err: Error | null) => {
      if (err) {
        console.error('Primary delete error', err)
      }
    })
    replicaClient.del(key, (err: Error | null, result: number | null) => {
      if (err) return reject(err)
      resolve(`${key} deleted: ${result}`)
    })
  })
}

export {get, set, del}
