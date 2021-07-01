import redis from 'redis'
import {getRequiredServerEnvVar} from './misc'

const REDIS_URL = getRequiredServerEnvVar('REDIS_URL')

const client = redis.createClient({url: REDIS_URL})

function get(key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    client.get(key, (err: Error | null, result: string | null) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

function set(key: string, value: string): Promise<'OK'> {
  return new Promise((resolve, reject) => {
    client.set(key, value, (err: Error | null, reply: 'OK') => {
      if (err) return reject(err)
      resolve(reply)
    })
  })
}

function del(key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.del(key, (err: Error | null, result: number | null) => {
      if (err) return reject(err)
      resolve(`${key} deleted: ${result}`)
    })
  })
}

client.on('error', (error: string) => {
  console.error('REDIS ERROR:', error)
})

export {get, set, del}
