import { invariantResponse } from '@epic-web/invariant'
import { data as json } from 'react-router'
import { cache } from '#app/utils/cache.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/cache.shared.$cache-key'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const cacheKey = params['cache-key']
	invariantResponse(cacheKey, 'cache-key is required')
	return json({
		cacheKey,
		value: await cache.get(cacheKey),
	})
}
