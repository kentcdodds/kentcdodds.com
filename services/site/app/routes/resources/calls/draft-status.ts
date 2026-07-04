import { data as json } from 'react-router'
import { db } from '#app/utils/db.server.ts'
import { callKentEpisodeDraftTable } from '#app/utils/db/schema.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/draft-status'

/**
 * Lightweight status-only endpoint for polling during episode draft processing.
 * Use this instead of revalidating the full $callId loader to avoid fetching
 * transcript, title, description, keywords on every 1.5s poll.
 */
export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const url = new URL(request.url)
	const callId = url.searchParams.get('callId')
	if (!callId) throw new Response('callId is required', { status: 400 })

	const draft = await db.findOne(callKentEpisodeDraftTable, {
		where: { callId },
	})
	if (!draft) throw new Response('Not found', { status: 404 })

	return json({
		status: draft.status,
		step: draft.step,
		errorMessage: draft.errorMessage,
	})
}
