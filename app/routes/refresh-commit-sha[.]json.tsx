import type {LoaderFunction} from 'remix'
import {redisCache} from '~/utils/redis.server'
import {commitShaKey as refreshCacheCommitShaKey} from './action/refresh-cache'

export const loader: LoaderFunction = async () => {
  const shaInfo = await redisCache.get(refreshCacheCommitShaKey)
  const data = JSON.stringify(shaInfo)
  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(data)),
    },
  })
}
