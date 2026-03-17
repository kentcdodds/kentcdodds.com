import { invariantResponse } from '@epic-web/invariant'
import { data as json } from 'react-router'
import { getLexicalSearchChunkDetail } from '#app/utils/lexical-search-client.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/lexical-search.chunk_.$chunkId'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const { chunkId } = params
	invariantResponse(chunkId, 'chunkId is required')
	return json({
		chunkId,
		value: await getLexicalSearchChunkDetail(chunkId),
	})
}
