import redis from 'redis'
import {getRequiredServerEnvVar} from './misc'

const REDIS_URL = 'redis://:alex_rocks@localhost:6379' // getRequiredServerEnvVar('REDIS_URL')
const replica = new URL(REDIS_URL)
const isLocalHost = replica.hostname === 'localhost'

const PRIMARY_REGION = isLocalHost
  ? null
  : getRequiredServerEnvVar('PRIMARY_REGION')
const FLY_REGION = isLocalHost ? null : getRequiredServerEnvVar('FLY_REGION')

if (!isLocalHost) {
  replica.host = `${FLY_REGION}.${replica.host}`
}

const replicaClient = redis.createClient({
  url: replica.toString(),
  family: 'IPv6',
})

let primaryClient: ReturnType<typeof redis.createClient> | null = null
if (FLY_REGION !== PRIMARY_REGION) {
  const primary = new URL(REDIS_URL)
  if (!isLocalHost) {
    primary.host = `${PRIMARY_REGION}.${primary.host}`
  }
  primaryClient = redis.createClient({url: primary.toString()})
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

primaryClient?.on('error', (error: string) => {
  console.error(`REDIS PRIMARY (${PRIMARY_REGION})  ERROR:`, error)
})

replicaClient.on('error', (error: string) => {
  console.error(`REDIS REPLICA (${FLY_REGION}) ERROR:`, error)
})

export {get, set, del}
