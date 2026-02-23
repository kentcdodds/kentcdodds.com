import { data as json } from 'react-router'
import { prisma } from '#app/utils/prisma.server.ts'
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

	const draft = await prisma.callKentEpisodeDraft.findUnique({
		where: { callId },
		select: {
			id: true,
			status: true,
			step: true,
			errorMessage: true,
		},
	})
	if (!draft) throw new Response('Not found', { status: 404 })

	return json({
		status: draft.status,
		step: draft.step,
		errorMessage: draft.errorMessage,
	})
}
