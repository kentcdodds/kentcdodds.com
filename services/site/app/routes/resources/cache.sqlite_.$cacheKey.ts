import { invariantResponse } from '@epic-web/invariant'
import { redirect } from 'react-router'
import { type Route } from './+types/cache.sqlite_.$cacheKey'

export async function loader({ request, params }: Route.LoaderArgs) {
	const { cacheKey } = params
	invariantResponse(cacheKey, 'cacheKey is required')
	const url = new URL(request.url)
	const destination = `/resources/cache/kv/${encodeURIComponent(cacheKey)}${url.search}`
	throw redirect(destination, { status: 308 })
}
