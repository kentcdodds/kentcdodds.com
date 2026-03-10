import { createDraftAudioResponse } from '#app/utils/draft-audio-response.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/draft-episode-audio'

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const url = new URL(request.url)
	const callId = url.searchParams.get('callId')
	if (!callId) throw new Response('callId is required', { status: 400 })

	const draft = await prisma.callKentEpisodeDraft.findUnique({
		where: { callId },
		select: {
			episodeAudioKey: true,
			episodeAudioContentType: true,
			episodeAudioSize: true,
		},
	})
	if (!draft) throw new Response('Not found', { status: 404 })

	if (!draft.episodeAudioKey) throw new Response('Not found', { status: 404 })

	return await createDraftAudioResponse({
		request,
		key: draft.episodeAudioKey,
		contentType: draft.episodeAudioContentType,
		size: draft.episodeAudioSize,
		defaultContentType: 'audio/mpeg',
	})
}
