import { invariantResponse } from '@epic-web/invariant'
import { data as json } from 'react-router'
import { lruCache } from '#app/utils/cache.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/cache.lru.$cacheKey'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const { cacheKey } = params
	invariantResponse(cacheKey, 'cacheKey is required')
	return json({
		cacheKey,
		value: lruCache.get(cacheKey),
	})
}
