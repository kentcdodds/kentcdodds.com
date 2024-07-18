import {
	json,
	type HeadersFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	isRouteErrorResponse,
	Link,
	useLoaderData,
	useParams,
} from '@remix-run/react'
import { serverOnly$ } from 'vite-env-only'
import { ServerError } from '#app/components/errors.tsx'
import { Grid } from '#app/components/grid.tsx'
import { TriangleIcon } from '#app/components/icons.tsx'
import { MissingSomething } from '#app/components/kifs.tsx'
import { H3, Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import { getCWKEpisodePath } from '#app/utils/chats-with-kent.ts'
import { orderBy } from '#app/utils/cjs/lodash.ts'
import {
	formatDuration,
	reuseUsefulLoaderHeaders,
	useCapturedRouteError,
} from '#app/utils/misc.tsx'
import { useChatsEpisodeUIState } from '#app/utils/providers.tsx'
import { getSeasonListItems } from '#app/utils/simplecast.server.ts'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'

export const handle: KCDHandle = {
	getSitemapEntries: serverOnly$(async (request) => {
		const seasons = await getSeasonListItems({ request })
		return seasons.map((season) => {
			return {
				route: `/chats/${season.seasonNumber.toString().padStart(2, '0')}`,
				priority: 0.4,
			}
		})
	}),
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	if (!params.season) {
		throw new Error('params.season is not defined')
	}
	const timings = {}
	const seasons = await getSeasonListItems({ request, timings })
	const seasonNumber = Number(params.season)
	const season = seasons.find((s) => s.seasonNumber === seasonNumber)
	if (!season) {
		throw new Response(`No season for ${params.season}`, { status: 404 })
	}

	return json(
		{ season },
		{
			headers: {
				'Cache-Control': 'public, max-age=600',
				'Server-Timing': getServerTimeHeader(timings),
			},
		},
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function ChatsSeason() {
	const { season } = useLoaderData<typeof loader>()
	const { sortOrder } = useChatsEpisodeUIState()
	const episodes = orderBy(season.episodes, 'episodeNumber', sortOrder)
	return episodes.map((episode) => (
		<Link
			className="group focus:outline-none"
			key={episode.slug}
			to={getCWKEpisodePath(episode)}
		>
			<Grid
				nested
				className="relative border-b border-gray-200 py-10 dark:border-gray-600 lg:py-5"
			>
				<div className="bg-secondary absolute -inset-px -mx-6 hidden rounded-lg group-hover:block group-focus:block" />

				<div className="relative col-span-1 flex-none">
					<div className="absolute inset-0 flex scale-0 transform items-center justify-center opacity-0 transition group-hover:scale-100 group-hover:opacity-100 group-focus:opacity-100">
						<div className="flex-none rounded-full bg-white p-4 text-gray-800">
							<TriangleIcon size={12} />
						</div>
					</div>
					<img
						className="h-16 w-full rounded-lg object-cover"
						src={episode.image}
						alt={episode.title}
						loading="lazy"
					/>
				</div>
				<div className="text-primary relative col-span-3 flex flex-col md:col-span-7 lg:col-span-11 lg:flex-row lg:items-center lg:justify-between">
					<div className="mb-3 text-xl font-medium lg:mb-0">
						<span className="inline-block w-10 lg:text-lg">
							{`${episode.episodeNumber.toString().padStart(2, '0')}.`}
						</span>
						{episode.title}
					</div>
					<div className="text-lg font-medium text-gray-400">
						{formatDuration(episode.duration)}
					</div>
				</div>
			</Grid>
		</Link>
	))
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	const params = useParams()

	if (isRouteErrorResponse(error)) {
		console.error('CatchBoundary', error)
		if (error.status === 404) {
			return (
				<Grid nested className="mt-3">
					<div className="col-span-full md:col-span-5">
						<H3>{`Season not found`}</H3>
						<Paragraph>{`Are you sure ${
							params.season ? `season ${params.season}` : 'this season'
						} exists?`}</Paragraph>
					</div>
					<div className="md:col-span-start-6 col-span-full md:col-span-5">
						<MissingSomething className="rounded-lg" aspectRatio="3:4" />
					</div>
				</Grid>
			)
		}
		throw new Error(`Unhandled error: ${error.status}`)
	}

	console.error(error)
	return <ServerError />
}
