import {
	json,
	type HeadersFunction,
	type LoaderFunction,
} from '@remix-run/node'
import {
	isRouteErrorResponse,
	Link,
	useLoaderData,
	Outlet,
	useMatches,
	useParams,
} from '@remix-run/react'
import { clsx } from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import * as React from 'react'
import { serverOnly$ } from 'vite-env-only'
import { getEpisodesBySeason } from '../calls.tsx'
import { ServerError } from '~/components/errors.tsx'
import { Grid } from '~/components/grid.tsx'
import { TriangleIcon } from '~/components/icons.tsx'
import { MissingSomething } from '~/components/kifs.tsx'
import { H3, Paragraph } from '~/components/typography.tsx'
import {
	type CallKentEpisode,
	type CallKentSeason,
	type KCDHandle,
} from '~/types.ts'
import {
	getEpisodeFromParams,
	getEpisodePath,
	type Params as CallPlayerParams,
} from '~/utils/call-kent.ts'
import { orderBy } from '~/utils/cjs/lodash.js'
import {
	formatDuration,
	reuseUsefulLoaderHeaders,
	useCapturedRouteError,
} from '~/utils/misc.tsx'
import { useCallsEpisodeUIState } from '~/utils/providers.tsx'
import { getServerTimeHeader } from '~/utils/timing.server.ts'
import { getEpisodes } from '~/utils/transistor.server.ts'

export const handle: KCDHandle = {
	getSitemapEntries: serverOnly$(async (request) => {
		const episodes = await getEpisodes({ request })
		const seasons = getEpisodesBySeason(episodes)

		return seasons.map((season) => {
			return {
				route: `/calls/${season.seasonNumber.toString().padStart(2, '0')}`,
				priority: 0.4,
			}
		})
	}),
}

type LoaderData = {
	//   episodes: Await<ReturnType<typeof getEpisodes>>
	season: CallKentSeason
}

export const loader: LoaderFunction = async ({ params, request }) => {
	const timings = {}
	const episodes = await getEpisodes({ request, timings })

	const seasons = getEpisodesBySeason(episodes)

	const seasonNumber = Number(params.season)
	const season = seasons.find((s) => s.seasonNumber === seasonNumber)
	if (!season) {
		throw new Response(`No season for ${params.season}`, { status: 404 })
	}

	const data: LoaderData = {
		//   episodes,
		season,
	}

	return json(data, {
		headers: {
			'Cache-Control': 'private, max-age=3600',
			Vary: 'Cookie',
			'Server-Timing': getServerTimeHeader(timings),
		},
	})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function CallsSeason() {
	const { season } = useLoaderData<LoaderData>()
	const matches = useMatches()
	const shouldReduceMotion = useReducedMotion()
	const { sortOrder } = useCallsEpisodeUIState()
	const episodes = orderBy(season.episodes, 'episodeNumber', sortOrder)

	const callPlayerMatch = matches.find(
		(match) => (match.handle as KCDHandle | undefined)?.id === 'call-player',
	)
	let selectedEpisode: CallKentEpisode | undefined
	if (callPlayerMatch) {
		const callPlayerParams = callPlayerMatch.params as CallPlayerParams
		selectedEpisode = getEpisodeFromParams(episodes, callPlayerParams)
	}
	const initialSelectedEpisode = React.useRef(selectedEpisode)

	React.useEffect(() => {
		if (!initialSelectedEpisode.current) return
		const href = getEpisodePath(initialSelectedEpisode.current)
		document.querySelector(`[href="${href}"]`)?.scrollIntoView()
	}, [])

	// used to automatically prefix numbers with the correct amount of zeros
	let numberLength = episodes.length.toString().length
	if (numberLength < 2) numberLength = 2

	return episodes.map((episode) => {
		const path = getEpisodePath(episode)

		return (
			<div className="border-b border-gray-200 dark:border-gray-600" key={path}>
				<Link
					preventScrollReset
					to={path}
					className="group focus:outline-none"
					prefetch="intent"
				>
					<Grid nested className="relative py-10 lg:py-5">
						<div className="bg-secondary absolute -inset-px -mx-6 hidden rounded-lg group-hover:block group-focus:block" />
						<div className="relative col-span-1 flex-none">
							<div className="absolute inset-0 flex scale-0 transform items-center justify-center opacity-0 transition group-hover:scale-100 group-hover:opacity-100 group-focus:scale-100 group-focus:opacity-100">
								<div className="flex-none rounded-full bg-white p-4 text-gray-800">
									<TriangleIcon size={12} />
								</div>
							</div>
							<img
								className="h-16 w-full rounded-lg object-cover"
								src={episode.imageUrl}
								loading="lazy"
								alt="" // this is decorative only
							/>
						</div>
						<div className="text-primary relative col-span-3 flex flex-col md:col-span-7 lg:col-span-11 lg:flex-row lg:items-center lg:justify-between">
							<div className="mb-3 text-xl font-medium lg:mb-0">
								{/* For most optimal display, this will needs adjustment once you'll hit 5 digits */}
								<span
									className={clsx('inline-block lg:text-lg', {
										'w-10': numberLength <= 3,
										'w-14': numberLength === 4,
										'w-auto pr-4': numberLength > 4,
									})}
								>
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

				<Grid nested>
					<AnimatePresence>
						{selectedEpisode === episode ? (
							<motion.div
								variants={{
									collapsed: {
										height: 0,
										marginTop: 0,
										marginBottom: 0,
										opacity: 0,
									},
									expanded: {
										height: 'auto',
										marginTop: '1rem',
										marginBottom: '3rem',
										opacity: 1,
									},
								}}
								initial="collapsed"
								animate="expanded"
								exit="collapsed"
								transition={
									shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }
								}
								// @ts-expect-error framer-motion + latest typescript types has issues
								className="relative col-span-full"
							>
								<Outlet />
							</motion.div>
						) : null}
					</AnimatePresence>
				</Grid>
			</div>
		)
	})
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
