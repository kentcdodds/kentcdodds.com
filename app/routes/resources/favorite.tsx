import { clsx } from 'clsx'
import * as React from 'react'
import { data as json, Link, useFetcher, type HeadersFunction } from 'react-router'
import { z } from 'zod'
import { SpinnerIcon, StarIcon } from '#app/components/icons.tsx'
import {
	favoriteContentTypes,
	favoriteIntents,
	parseEpisodeFavoriteContentId,
	type FavoriteContentType,
} from '#app/utils/favorites.ts'
import { reuseUsefulLoaderHeaders } from '#app/utils/misc.ts'
import { useOptionalUser } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/favorite'

const favoriteResourceRoute = '/resources/favorite'

type FavoriteStatusResponse = {
	isFavorite: boolean
	authenticated?: boolean
	error?: string
}

function isFavoriteStatusResponse(data: unknown): data is FavoriteStatusResponse {
	return (
		typeof data === 'object' &&
		data !== null &&
		'isFavorite' in data &&
		typeof (data as any).isFavorite === 'boolean'
	)
}

export function FavoriteToggle({
	contentType,
	contentId,
	initialIsFavorite,
	mode = 'button',
	label = 'Favorite',
	className,
}: {
	contentType: FavoriteContentType
	contentId: string
	initialIsFavorite?: boolean
	mode?: 'button' | 'icon'
	label?: string
	className?: string
}) {
	const user = useOptionalUser()
	const fetcherKey = `favorite:${contentType}:${contentId}`
	const fetcher = useFetcher<FavoriteStatusResponse>({ key: fetcherKey })

	const optimisticIntent = fetcher.formData?.get('intent')
	const optimisticIsFavorite =
		optimisticIntent === 'add'
			? true
			: optimisticIntent === 'remove'
				? false
				: undefined

	const fetchedIsFavorite = isFavoriteStatusResponse(fetcher.data)
		? fetcher.data.isFavorite
		: undefined

	const isFavorite =
		optimisticIsFavorite ?? fetchedIsFavorite ?? initialIsFavorite ?? false

	const shouldLoadInitial =
		Boolean(user) &&
		initialIsFavorite === undefined &&
		fetchedIsFavorite === undefined &&
		optimisticIsFavorite === undefined &&
		fetcher.state === 'idle'

	React.useEffect(() => {
		if (!shouldLoadInitial) return
		const searchParams = new URLSearchParams({
			contentType,
			contentId,
		})
		void fetcher.load(`${favoriteResourceRoute}?${searchParams.toString()}`)
	}, [shouldLoadInitial, contentType, contentId, fetcher])

	const nextIntent = isFavorite ? 'remove' : 'add'
	const isBusy = fetcher.state !== 'idle'

	const icon = isBusy ? (
		<SpinnerIcon size={18} className="animate-spin" />
	) : (
		<StarIcon size={18} filled={isFavorite} />
	)

	const text = isFavorite ? 'Favorited' : label
	const iconAriaLabel = isFavorite ? 'Unfavorite' : label

	if (!user) {
		return (
			<Link
				to="/login"
				className={clsx(
					mode === 'icon'
						? 'text-secondary hover:text-team-current focus:text-team-current inline-flex items-center justify-center transition focus:outline-none'
						: 'focus-ring text-primary bg-secondary hover:text-team-current inline-flex items-center gap-2 rounded-full px-6 py-3 text-lg font-medium transition focus:outline-none',
					className,
				)}
				aria-label="Login to favorite"
				title="Login to favorite"
			>
				{icon}
				{mode === 'button' ? <span>Login to favorite</span> : null}
			</Link>
		)
	}

	return (
		<fetcher.Form
			method="POST"
			action={favoriteResourceRoute}
			className={className}
		>
			<input type="hidden" name="contentType" value={contentType} />
			<input type="hidden" name="contentId" value={contentId} />
			<input type="hidden" name="intent" value={nextIntent} />
			<button
				type="submit"
				disabled={isBusy}
				aria-pressed={isFavorite}
				aria-label={mode === 'icon' ? iconAriaLabel : undefined}
				title={mode === 'icon' ? iconAriaLabel : undefined}
				className={clsx(
					mode === 'icon'
						? clsx(
								'focus-ring inline-flex items-center justify-center rounded-md p-2 transition focus:outline-none',
								{
									'text-team-current': isFavorite,
									'text-secondary hover:text-team-current focus:text-team-current':
										!isFavorite,
								},
							)
						: clsx(
								'focus-ring inline-flex items-center gap-2 rounded-full px-6 py-3 text-lg font-medium transition focus:outline-none',
								{
									'bg-inverse text-inverse': isFavorite,
									'bg-secondary text-primary hover:text-team-current focus:text-team-current':
										!isFavorite,
								},
							),
				)}
			>
				{icon}
				{mode === 'button' ? <span>{text}</span> : null}
			</button>
		</fetcher.Form>
	)
}

async function getFavoritesServerServices() {
	const [{ prisma }, { ensurePrimary }, { getUser }] = await Promise.all([
		import('#app/utils/prisma.server.ts'),
		import('#app/utils/litefs-js.server.ts'),
		import('#app/utils/session.server.ts'),
	])
	return { prisma, ensurePrimary, getUser }
}

const FavoriteFormSchema = z.object({
	contentType: z.enum(favoriteContentTypes),
	contentId: z.string().min(1).max(200),
	intent: z.enum(favoriteIntents),
})

export async function action({ request }: Route.ActionArgs) {
	const { prisma, ensurePrimary, getUser } = await getFavoritesServerServices()

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

const FavoriteStatusQuerySchema = z.object({
	contentType: z.enum(favoriteContentTypes),
	contentId: z.string().min(1).max(200),
})

const FavoriteListQuerySchema = z.object({
	contentType: z.enum(favoriteContentTypes),
})

export async function loader({ request }: Route.LoaderArgs) {
	const { prisma, getUser } = await getFavoritesServerServices()
	const headers = {
		'Cache-Control': 'private, max-age=0, must-revalidate',
		Vary: 'Cookie',
	}
	const url = new URL(request.url)
	const contentType = url.searchParams.get('contentType')
	const contentId = url.searchParams.get('contentId')

	// When contentId is present we return a status payload.
	if (contentId) {
		const submission = FavoriteStatusQuerySchema.safeParse({ contentType, contentId })
		if (!submission.success) {
			return json(
				{ isFavorite: false, error: 'INVALID_QUERY' } as const,
				{ status: 400, headers },
			)
		}

		const parsed = submission.data
		if (
			parsed.contentType === 'call-kent-episode' ||
			parsed.contentType === 'chats-with-kent-episode'
		) {
			if (!parseEpisodeFavoriteContentId(parsed.contentId)) {
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
					contentType: parsed.contentType,
					contentId: parsed.contentId,
				},
			},
			select: { id: true },
		})

		return json(
			{ isFavorite: Boolean(favorite), authenticated: true } as const,
			{ headers },
		)
	}

	// When contentId is absent we return a list payload.
	const listSubmission = FavoriteListQuerySchema.safeParse({ contentType })
	if (!listSubmission.success) {
		return json({ contentIds: [], error: 'INVALID_QUERY' } as const, {
			status: 400,
			headers,
		})
	}
	const user = await getUser(request)
	if (!user) {
		return json({ contentIds: [] } as const, { headers })
	}
	const favorites = await prisma.favorite.findMany({
		where: { userId: user.id, contentType: listSubmission.data.contentType },
		select: { contentId: true },
		orderBy: { createdAt: 'desc' },
	})
	return json(
		{ contentIds: favorites.map((f) => f.contentId) } as const,
		{ headers },
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export { favoriteResourceRoute }

