import { data as json, type HeadersFunction } from 'react-router'
import { z } from 'zod'
import { favoriteContentTypes } from '#app/utils/favorites.ts'
import { reuseUsefulLoaderHeaders } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/favorites'

const FavoritesQuerySchema = z.object({
	contentType: z.enum(favoriteContentTypes),
})

export async function loader({ request }: Route.LoaderArgs) {
	const headers = {
		'Cache-Control': 'private, max-age=0, must-revalidate',
		Vary: 'Cookie',
	}
	const url = new URL(request.url)
	const submission = FavoritesQuerySchema.safeParse({
		contentType: url.searchParams.get('contentType'),
	})
	if (!submission.success) {
		return json(
			{ contentIds: [], error: 'INVALID_QUERY' } as const,
			{ status: 400, headers },
		)
	}
	const { contentType } = submission.data

	const user = await getUser(request)
	if (!user) {
		return json({ contentIds: [] } as const, { headers })
	}

	const favorites = await prisma.favorite.findMany({
		where: { userId: user.id, contentType },
		select: { contentId: true },
		orderBy: { createdAt: 'desc' },
	})
	return json(
		{
			contentIds: favorites.map((f) => f.contentId),
		} as const,
		{ headers },
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

