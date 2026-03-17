import { invariantResponse } from '@epic-web/invariant'
import { data as json } from 'react-router'
import { getLexicalSearchSourceDetail } from '#app/utils/lexical-search-client.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/lexical-search.source_.$sourceKey'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const { sourceKey } = params
	invariantResponse(sourceKey, 'sourceKey is required')
	const value = await getLexicalSearchSourceDetail(sourceKey)
	invariantResponse(value.source, 'Source not found', { status: 404 })
	return json({
		sourceKey,
		value,
	})
}
