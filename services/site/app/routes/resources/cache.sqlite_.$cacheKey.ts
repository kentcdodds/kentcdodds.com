import { invariantResponse } from '@epic-web/invariant'
import { data as json } from 'react-router'
import { cache, isFileCacheAvailable } from '#app/utils/cache.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/cache.sqlite_.$cacheKey'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireAdminUser(request)
	if (!isFileCacheAvailable()) {
		throw new Response(
			'SQLite cache resources are unavailable in this runtime.',
			{
				status: 404,
			},
		)
	}

	const { cacheKey } = params
	invariantResponse(cacheKey, 'cacheKey is required')
	return json({
		cacheKey,
		value: await cache.get(cacheKey),
	})
}
