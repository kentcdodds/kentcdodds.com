import { invariantResponse } from '@epic-web/invariant'
import { data as json } from 'react-router'
import { getLexicalSearchDocDetail } from '#app/utils/lexical-search-client.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/lexical-search.doc_.$docId'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const { docId } = params
	invariantResponse(docId, 'docId is required')
	return json({
		docId,
		value: await getLexicalSearchDocDetail(docId),
	})
}
