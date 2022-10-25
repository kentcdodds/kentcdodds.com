import {json} from '@remix-run/node'
import {prisma} from '~/utils/prisma.server'
import {commitShaKey as refreshCacheCommitShaKey} from './action/refresh-cache'

export async function loader() {
  const result = await prisma.cache.findUnique({
    where: {key: refreshCacheCommitShaKey},
    select: {value: true},
  })
  if (!result) {
    return json(null)
  }
  return new Response(result.value, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(result.value)),
    },
  })
}
