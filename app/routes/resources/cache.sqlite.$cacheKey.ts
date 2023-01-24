import type {DataFunctionArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import invariant from 'tiny-invariant'
import {cache} from '~/utils/cache.server'
import {
  ensureInstance,
  getAllInstances,
  getInstanceInfo,
  getInternalInstanceDomain,
} from '~/utils/fly.server'
import {getRequiredServerEnvVar} from '~/utils/misc'
import {requireAdminUser} from '~/utils/session.server'

export async function loader({request, params}: DataFunctionArgs) {
  await requireAdminUser(request)
  const searchParams = new URL(request.url).searchParams
  const currentInstanceInfo = getInstanceInfo()
  const allInstances = await getAllInstances()
  const instance =
    searchParams.get('instance') ?? currentInstanceInfo.currentInstance
  await ensureInstance(instance)

  const {cacheKey} = params
  invariant(cacheKey, 'cacheKey is required')
  return json({
    instance: {
      hostname: instance,
      region: allInstances[instance],
      isPrimary: currentInstanceInfo.primaryInstance === instance,
    },
    cacheKey,
    value: cache.get(cacheKey),
  })
}

export async function action({request, params}: DataFunctionArgs) {
  const {currentIsPrimary, primaryInstance} = getInstanceInfo()
  if (!currentIsPrimary) {
    throw new Error(
      `${request.url} should only be called on the primary instance (${primaryInstance})}`,
    )
  }
  const token = getRequiredServerEnvVar('INTERNAL_COMMAND_TOKEN')
  const isAuthorized =
    request.headers.get('Authorization') === `Bearer ${token}`
  if (!isAuthorized) {
    // rick roll them
    return redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  }
  const {cacheKey} = params
  invariant(cacheKey, 'cacheKey is required')
  const value = await request.json()
  await cache.set(cacheKey, value)
  return json({success: true})
}

export async function updatePrimaryCacheValue({
  key,
  value,
}: {
  key: string
  value: any
}) {
  const {currentIsPrimary, primaryInstance} = getInstanceInfo()
  if (currentIsPrimary) {
    throw new Error(
      `updatePrimaryCacheValue should not be called on the primary instance (${primaryInstance})}`,
    )
  }
  const domain = getInternalInstanceDomain(primaryInstance)
  const token = getRequiredServerEnvVar('INTERNAL_COMMAND_TOKEN')
  return fetch(`https://${domain}/resources/cache/sqlite/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  })
}
