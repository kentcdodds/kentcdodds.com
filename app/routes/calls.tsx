import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@reach/tabs'
import {
	json,
	type HeadersFunction,
	type LoaderFunction,
	type MetaFunction,
} from '@remix-run/node'
import {
	Link,
	Outlet,
	useLoaderData,
	useMatches,
	useNavigate,
} from '@remix-run/react'
import { clsx } from 'clsx'
import * as React from 'react'
import { ButtonLink } from '~/components/button.tsx'
import { Grid } from '~/components/grid.tsx'
import { ChevronDownIcon, ChevronUpIcon } from '~/components/icons.tsx'
import { PodcastSubs } from '~/components/podcast-subs.tsx'
import { BlogSection } from '~/components/sections/blog-section.tsx'
import { HeroSection } from '~/components/sections/hero-section.tsx'
import { Spacer } from '~/components/spacer.tsx'
import { H4, H6, Paragraph } from '~/components/typography.tsx'
import { externalLinks } from '~/external-links.tsx'
import {
	getGenericSocialImage,
	getImageBuilder,
	getImgProps,
	images,
} from '~/images.tsx'
import { type RootLoaderType } from '~/root.tsx'
import { type CallKentSeason, type Await, type KCDHandle } from '~/types.ts'
import { getBlogRecommendations } from '~/utils/blog.server.ts'
import { groupBy } from '~/utils/cjs/lodash.js'
import {
	getDisplayUrl,
	getOrigin,
	getUrl,
	reuseUsefulLoaderHeaders,
} from '~/utils/misc.tsx'
import {
	CallsEpisodeUIStateProvider,
	useMatchLoaderData,
} from '~/utils/providers.tsx'
import { getSocialMetas } from '~/utils/seo.ts'
import { getServerTimeHeader } from '~/utils/timing.server.ts'
import { getEpisodes } from '~/utils/transistor.server.ts'

export const handle: KCDHandle & { id: string } = {
	id: 'calls',
}

export type LoaderData = {
	episodes: Await<ReturnType<typeof getEpisodes>>
	blogRecommendations: Await<ReturnType<typeof getBlogRecommendations>>
}

export const getEpisodesBySeason = (
	episodes: Await<ReturnType<typeof getEpisodes>>,
) => {
	const groupedEpisodeBySeasons = groupBy(episodes, 'seasonNumber')
	const seasons: Array<CallKentSeason> = []
	Object.entries(groupedEpisodeBySeasons).forEach(([key, value]) => {
		seasons.push({
			seasonNumber: +key,
			episodes: value,
		})
	})
	return seasons
}

export const loader: LoaderFunction = async ({ request }) => {
	const timings = {}
	const [blogRecommendations, episodes] = await Promise.all([
		getBlogRecommendations({ request, timings }),
		getEpisodes({ request, timings }),
	])

	const seasons = getEpisodesBySeason(episodes)

	const seasonNumber = seasons[seasons.length - 1]?.seasonNumber ?? 1
	const season = seasons.find((s) => s.seasonNumber === seasonNumber)
	if (!season) {
		throw new Error(`oh no. season for ${seasonNumber}`)
	}

	const data: LoaderData = {
		blogRecommendations,
		episodes,
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

export const meta: MetaFunction<typeof loader, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	return getSocialMetas({
		title: 'Call Kent Podcast',
		description: `Leave Kent an audio message here, then your message and Kent's response are published in the podcast.`,
		keywords: 'podcast, call kent, call kent c. dodds, the call kent podcast',
		url: getUrl(requestInfo),
		image: getGenericSocialImage({
			words: 'Listen to the Call Kent Podcast and make your own call.',
			featuredImage: images.microphone({
				// if we don't do this resize, the narrow microphone appears on the
				// far right of the social image
				resize: {
					type: 'pad',
					width: 1200,
					height: 1200,
				},
			}),
			url: getDisplayUrl({
				origin: getOrigin(requestInfo),
				path: '/calls',
			}),
		}),
	})
}

export default function CallHomeScreen() {
	const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc')

	const data = useLoaderData<LoaderData>()
	const navigate = useNavigate()

	const groupedEpisodeBySeasons = groupBy(data.episodes, 'seasonNumber')
	const seasons: Array<CallKentSeason> = []
	Object.entries(groupedEpisodeBySeasons).forEach(([key, value]) => {
		seasons.push({
			seasonNumber: +key,
			episodes: value,
		})
	})

	//show latest season first.
	seasons.reverse()

	const matches = useMatches()
	const last = matches[matches.length - 1]

	const seasonNumber = last?.params.season
		? Number(last.params.season)
		: // we use the first one because the seasons are in reverse order
			// oh, and this should never happen anyway because we redirect
			// in the event there's no season param. But it's just to be safe.
			seasons[0]?.seasonNumber ?? 1

	const currentSeason = seasons.find((s) => s.seasonNumber === seasonNumber)
	const tabIndex = currentSeason ? seasons.indexOf(currentSeason) : 0

	function handleTabChange(index: number) {
		const chosenSeason = seasons[index]
		if (chosenSeason) {
			navigate(String(chosenSeason.seasonNumber).padStart(2, '0'), {
				preventScrollReset: true,
			})
		}
	}

	return (
		<>
			<HeroSection
				title="Calls with Kent C. Dodds."
				subtitle="You call, I'll answer."
				imageBuilder={images.microphone}
				arrowUrl="#episodes"
				arrowLabel="Take a listen"
				action={
					<ButtonLink variant="primary" to="./record" className="mr-auto">
						Record your call
					</ButtonLink>
				}
			/>

			<Grid>
				<H6 as="div" className="col-span-full mb-6">
					Listen to the podcasts here
				</H6>

				<PodcastSubs
					apple={externalLinks.callKentApple}
					pocketCasts={externalLinks.callKentPocketCasts}
					spotify={externalLinks.callKentSpotify}
					rss={externalLinks.callKentRSS}
				/>
			</Grid>

			<Spacer size="base" />

			<Grid>
				<div className="col-span-full lg:col-span-6">
					<img
						title="Photo by Luke Southern"
						{...getImgProps(
							getImageBuilder(
								'unsplash/photo-1571079570759-8b8800f7c412',
								'Phone sitting on a stool',
							),
							{
								className: 'w-full rounded-lg object-cover',
								widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
								sizes: [
									'(max-width: 1023px) 80vw',
									'(min-width: 1024px) and (max-width: 1620px) 40vw',
									'630px',
								],
								transformations: {
									resize: {
										type: 'fill',
										aspectRatio: '4:3',
									},
								},
							},
						)}
					/>
				</div>
				<Spacer size="xs" className="col-span-full block lg:hidden" />
				<div className="col-span-full lg:col-span-5 lg:col-start-8">
					<H4 as="p">{`What's this all about?`}</H4>
					<div className="flex flex-col gap-3">
						<Paragraph>
							{`The goal of the Call Kent Podcast is to `}
							<strong>get my answers to your questions.</strong>
							{`
              You record your brief question (120 seconds or less) right from
              your browser. Then I listen to it later and give my response,
              and through the magic of technology (ffmpeg), our question
              and answer are stitched together and published to the podcast
              feed.
            `}
						</Paragraph>
						<Paragraph>{`I look forward to hearing from you!`}</Paragraph>
						<Spacer size="2xs" />
						<ButtonLink variant="primary" to="./record">
							Record your call
						</ButtonLink>
					</div>
				</div>
			</Grid>

			<Spacer size="base" />

			<Tabs
				as={Grid}
				className="mb-24 lg:mb-64"
				index={tabIndex}
				onChange={handleTabChange}
			>
				<TabList className="col-span-full mb-20 flex flex-col items-start bg-transparent lg:flex-row lg:space-x-12">
					{seasons.map((season) => (
						<Tab
							key={season.seasonNumber}
							tabIndex={-1}
							className="border-none p-0 text-4xl leading-tight focus:bg-transparent focus:outline-none"
						>
							<Link
								preventScrollReset
								className={clsx(
									'hover:text-primary focus:text-primary focus:outline-none',
									{
										'text-primary': season.seasonNumber === seasonNumber,
										'text-slate-500': season.seasonNumber !== seasonNumber,
									},
								)}
								to={String(season.seasonNumber).padStart(2, '0')}
								onClick={(e) => {
									if (e.metaKey) {
										e.stopPropagation()
									} else {
										e.preventDefault()
									}
								}}
							>
								{`Season ${season.seasonNumber}`}
							</Link>
						</Tab>
					))}
				</TabList>

				{currentSeason ? (
					<div className="col-span-full mb-6 flex flex-col lg:mb-12 lg:flex-row lg:justify-between">
						<H6
							id="episodes"
							as="h2"
							className="col-span-full mb-10 flex flex-col lg:mb-0 lg:flex-row"
						>
							<span>Calls with Kent C. Dodds</span>
							&nbsp;
							<span>{`Season ${currentSeason.seasonNumber} — ${currentSeason.episodes.length} episodes`}</span>
						</H6>

						<button
							className="text-primary group relative text-lg font-medium focus:outline-none"
							onClick={() =>
								setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
							}
						>
							<div className="bg-secondary absolute -bottom-2 -left-4 -right-4 -top-2 rounded-lg opacity-0 transition group-hover:opacity-100 group-focus:opacity-100" />
							<span className="relative inline-flex items-center">
								{sortOrder === 'asc' ? (
									<>
										Showing oldest first
										<ChevronUpIcon className="ml-2 text-gray-400" />
									</>
								) : (
									<>
										Showing newest first
										<ChevronDownIcon className="ml-2 text-gray-400" />
									</>
								)}
							</span>
						</button>
					</div>
				) : null}

				<TabPanels className="col-span-full">
					{seasons.map((season) => (
						<TabPanel
							key={season.seasonNumber}
							className="border-t border-gray-200 focus:outline-none dark:border-gray-600"
						>
							<CallsEpisodeUIStateProvider value={{ sortOrder }}>
								<Outlet />
							</CallsEpisodeUIStateProvider>
						</TabPanel>
					))}
				</TabPanels>
			</Tabs>

			<BlogSection
				articles={data.blogRecommendations}
				title="Looking for more content?"
				description="Have a look at these articles."
			/>
		</>
	)
}

export const useCallsData = () => useMatchLoaderData<LoaderData>(handle.id)
