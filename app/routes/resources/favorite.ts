import { data as json, type HeadersFunction } from 'react-router'
import { z } from 'zod'
import {
	favoriteContentTypes,
	parseEpisodeFavoriteContentId,
} from '#app/utils/favorites.ts'
import { reuseUsefulLoaderHeaders } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/favorite'

const FavoriteQuerySchema = z.object({
	contentType: z.enum(favoriteContentTypes),
	contentId: z.string().min(1).max(200),
})

export async function loader({ request }: Route.LoaderArgs) {
	const headers = {
		'Cache-Control': 'private, max-age=0, must-revalidate',
		Vary: 'Cookie',
	}
	const url = new URL(request.url)
	const query = {
		contentType: url.searchParams.get('contentType'),
		contentId: url.searchParams.get('contentId'),
	}
	const submission = FavoriteQuerySchema.safeParse(query)
	if (!submission.success) {
		return json(
			{ isFavorite: false, error: 'INVALID_QUERY' } as const,
			{ status: 400, headers },
		)
	}

	const { contentType, contentId } = submission.data
	if (
		contentType === 'call-kent-episode' ||
		contentType === 'chats-with-kent-episode'
	) {
		if (!parseEpisodeFavoriteContentId(contentId)) {
			return json(
				{ isFavorite: false, error: 'INVALID_CONTENT_ID' } as const,
				{ status: 400, headers },
			)
		}
	}

	const user = await getUser(request)
	if (!user) {
		return json(
			{ isFavorite: false, authenticated: false } as const,
			{ headers },
		)
	}

	const favorite = await prisma.favorite.findUnique({
		where: {
			userId_contentType_contentId: {
				userId: user.id,
				contentType,
				contentId,
			},
		},
		select: { id: true },
	})

	return json(
		{ isFavorite: Boolean(favorite), authenticated: true } as const,
		{ headers },
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

