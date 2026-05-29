import * as React from 'react'
import { clsx } from 'clsx'
import { data as json, Link, useFetcher, type HeadersFunction } from 'react-router'
import { z } from 'zod'
import {
	CheckIcon,
	CheckCircledIcon,
	SpinnerIcon,
} from '#app/components/icons.tsx'
import { parseEpisodeListenContentId } from '#app/utils/favorites.ts'
import { reuseUsefulLoaderHeaders } from '#app/utils/misc.ts'
import { useOptionalUser } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/podcast-listen'

const podcastListenResourceRoute = '/resources/podcast-listen'

type PodcastListenResponse = {
	listened: boolean
	authenticated: boolean
	error?: string
}

function isPodcastListenResponse(
	data: unknown,
): data is PodcastListenResponse {
	return (
		typeof data === 'object' &&
		data !== null &&
		'listened' in data &&
		typeof (data as PodcastListenResponse).listened === 'boolean' &&
		'authenticated' in data &&
		typeof (data as PodcastListenResponse).authenticated === 'boolean'
	)
}

export function PodcastListenToggle({
	contentId,
	initialListened = false,
	className,
}: {
	contentId: string
	initialListened?: boolean
	className?: string
}) {
	const parsedContentId = parseEpisodeListenContentId(contentId)
	if (!parsedContentId) {
		throw new Error(`Invalid podcast listen content id: ${contentId}`)
	}
	const { seasonNumber, episodeNumber } = parsedContentId
	const user = useOptionalUser()
	const fetcherKey = `podcast-listen:${seasonNumber}:${episodeNumber}`
	const fetcher = useFetcher<PodcastListenResponse>({ key: fetcherKey })

	const optimisticListened =
		fetcher.formData?.get('listened') === 'true'
			? true
			: fetcher.formData?.get('listened') === 'false'
				? false
				: undefined
	const fetchedListened =
		isPodcastListenResponse(fetcher.data) && !fetcher.data.error
			? fetcher.data.listened
			: undefined
	const listened =
		optimisticListened ?? fetchedListened ?? initialListened ?? false
	const isBusy = fetcher.state !== 'idle'

	if (
		!user ||
		(isPodcastListenResponse(fetcher.data) && !fetcher.data.authenticated)
	) {
		return (
			<Link
				to="/login"
				className={clsx(
					'focus-ring bg-secondary text-primary hover:text-team-current inline-flex items-center gap-3 rounded-full px-6 py-3 text-lg font-medium transition focus:outline-none',
					className,
				)}
			>
				<CheckCircledIcon size={20} className="opacity-65" />
				<span>Login to count your listen</span>
			</Link>
		)
	}

	return (
		<fetcher.Form
			method="POST"
			action={podcastListenResourceRoute}
			className={className}
		>
			<input type="hidden" name="contentId" value={contentId} />
			<input type="hidden" name="listened" value={String(!listened)} />
			<button
				type="submit"
				disabled={isBusy}
				aria-pressed={listened}
				className={clsx(
					'focus-ring inline-flex items-center gap-3 rounded-full px-6 py-3 text-lg font-medium transition focus:outline-none',
					listened
						? 'bg-emerald-600 text-white hover:bg-emerald-500'
						: 'bg-secondary text-primary hover:text-team-current',
				)}
			>
				{isBusy ? (
					<SpinnerIcon size={18} className="animate-spin" />
				) : listened ? (
					<CheckIcon />
				) : (
					<CheckCircledIcon size={20} className="opacity-65" />
				)}
				<span>{listened ? 'Listened' : 'Count my listen'}</span>
			</button>
		</fetcher.Form>
	)
}

async function getPodcastListenServerServices() {
	const [
		{ ensurePrimary },
		{ getUser },
		{ setEpisodePodcastListen },
		{ getPodcastListenRankings },
	] = await Promise.all([
		import('#app/utils/litefs-js.server.ts'),
		import('#app/utils/session.server.ts'),
		import('#app/utils/prisma.server.ts'),
		import('#app/utils/blog.server.ts'),
	])
	return {
		ensurePrimary,
		getUser,
		setEpisodePodcastListen,
		getPodcastListenRankings,
	}
}

const PodcastListenFormSchema = z.object({
	contentId: z.string().min(1).max(200),
	listened: z.enum(['true', 'false']).transform((value) => value === 'true'),
})

export async function action({ request }: Route.ActionArgs) {
	const {
		ensurePrimary,
		getUser,
		setEpisodePodcastListen,
		getPodcastListenRankings,
	} =
		await getPodcastListenServerServices()
	const formData = await request.formData()
	const submission = PodcastListenFormSchema.safeParse(
		Object.fromEntries(formData),
	)
	if (!submission.success) {
		return json(
			{ listened: false, authenticated: false, error: 'INVALID_FORM_DATA' },
			{ status: 400 },
		)
	}

	const parsedContentId = parseEpisodeListenContentId(submission.data.contentId)
	if (!parsedContentId) {
		return json(
			{ listened: false, authenticated: false, error: 'INVALID_CONTENT_ID' },
			{ status: 400 },
		)
	}

	const user = await getUser(request)
	if (!user) {
		return json(
			{ listened: false, authenticated: false, error: 'LOGIN_REQUIRED' },
			{ status: 401 },
		)
	}

	await ensurePrimary()
	const listened = await setEpisodePodcastListen({
		...parsedContentId,
		listened: submission.data.listened,
		userId: user.id,
	})

	await Promise.all([
		getPodcastListenRankings({
			request,
			seasonNumber: parsedContentId.seasonNumber,
			episodeNumber: parsedContentId.episodeNumber,
			forceFresh: true,
		}),
		getPodcastListenRankings({ request, forceFresh: true }),
	])

	return json({
		listened,
		authenticated: true,
	} satisfies PodcastListenResponse)
}

const PodcastListenQuerySchema = z.object({
	contentId: z.string().min(1).max(200),
})

export async function loader({ request }: Route.LoaderArgs) {
	const { getUser } = await getPodcastListenServerServices()
	const headers = {
		'Cache-Control': 'private, max-age=0, must-revalidate',
		Vary: 'Cookie',
	}
	const url = new URL(request.url)
	const submission = PodcastListenQuerySchema.safeParse({
		contentId: url.searchParams.get('contentId'),
	})
	if (!submission.success) {
		return json(
			{ listened: false, authenticated: false, error: 'INVALID_QUERY' },
			{ status: 400, headers },
		)
	}

	const parsedContentId = parseEpisodeListenContentId(submission.data.contentId)
	if (!parsedContentId) {
		return json(
			{ listened: false, authenticated: false, error: 'INVALID_CONTENT_ID' },
			{ status: 400, headers },
		)
	}

	const user = await getUser(request)
	if (!user) {
		return json(
			{ listened: false, authenticated: false } satisfies PodcastListenResponse,
			{ headers },
		)
	}

	const { getEpisodePodcastListens } = await import('#app/utils/prisma.server.ts')
	const listenIds = await getEpisodePodcastListens({ userId: user.id })

	return json(
		{
			listened: listenIds.has(submission.data.contentId),
			authenticated: true,
		} satisfies PodcastListenResponse,
		{ headers },
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export { podcastListenResourceRoute }
