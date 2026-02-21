import { data as json } from 'react-router'
import { z } from 'zod'
import {
	favoriteContentTypes,
	favoriteIntents,
	parseEpisodeFavoriteContentId,
} from '#app/utils/favorites.ts'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/favorite'

const FavoriteFormSchema = z.object({
	contentType: z.enum(favoriteContentTypes),
	contentId: z.string().min(1).max(200),
	intent: z.enum(favoriteIntents),
})

export async function action({ request }: Route.ActionArgs) {
	const user = await getUser(request)
	if (!user) {
		return json(
			{ isFavorite: false, error: 'LOGIN_REQUIRED' } as const,
			{ status: 401 },
		)
	}

	const formData = await request.formData()
	const submission = FavoriteFormSchema.safeParse(Object.fromEntries(formData))
	if (!submission.success) {
		return json(
			{ isFavorite: false, error: 'INVALID_FORM_DATA' } as const,
			{ status: 400 },
		)
	}

	const { contentType, contentId, intent } = submission.data

	// Episodes use a structured contentId; validate to keep the DB consistent.
	if (
		contentType === 'call-kent-episode' ||
		contentType === 'chats-with-kent-episode'
	) {
		if (!parseEpisodeFavoriteContentId(contentId)) {
			return json(
				{ isFavorite: false, error: 'INVALID_CONTENT_ID' } as const,
				{ status: 400 },
			)
		}
	}

	await ensurePrimary()

	const where = { userId: user.id, contentType, contentId }

	if (intent === 'add') {
		await prisma.favorite.upsert({
			where: { userId_contentType_contentId: where },
			create: where,
			update: {},
		})
		return json({ isFavorite: true } as const)
	}

	await prisma.favorite.deleteMany({ where })
	return json({ isFavorite: false } as const)
}

