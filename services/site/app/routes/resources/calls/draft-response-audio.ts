import { createDraftAudioResponse } from '#app/utils/draft-audio-response.server.ts'
import { db } from '#app/utils/db.server.ts'
import { callKentEpisodeDraftTable } from '#app/utils/db/schema.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/draft-response-audio'

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const url = new URL(request.url)
	const callId = url.searchParams.get('callId')
	if (!callId) throw new Response('callId is required', { status: 400 })

	const draft = await db.findOne(callKentEpisodeDraftTable, {
		where: { callId },
	})
	if (!draft) throw new Response('Not found', { status: 404 })
	if (!draft.responseAudioKey) throw new Response('Not found', { status: 404 })

	return await createDraftAudioResponse({
		request,
		key: draft.responseAudioKey,
		contentType: draft.responseAudioContentType,
		size: draft.responseAudioSize,
		defaultContentType: 'audio/webm',
	})
}
