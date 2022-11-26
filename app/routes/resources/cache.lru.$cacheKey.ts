import type {DataFunctionArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import invariant from 'tiny-invariant'
import {lruCache} from '~/utils/cache.server'
import {requireAdminUser} from '~/utils/session.server'

export async function loader({request, params}: DataFunctionArgs) {
  await requireAdminUser(request)
  const {cacheKey} = params
  invariant(cacheKey, 'cacheKey is required')
  return json({cacheKey, value: lruCache.get(cacheKey)})
}
