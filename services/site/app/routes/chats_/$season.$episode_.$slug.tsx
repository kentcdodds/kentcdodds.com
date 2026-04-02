import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import React, { useState } from 'react'
import {
	isRouteErrorResponse,
	Link,
	useLocation,
	data as json,
	redirect,
	type HeadersFunction,
	type LinksFunction,
} from 'react-router'
import { serverOnly$ } from 'vite-env-only/macros'
import { ArrowLink, BackLink } from '#app/components/arrow-button.tsx'
import { FourOhFour } from '#app/components/errors.tsx'
import {
	LiteYouTubeEmbed,
	links as youTubeEmbedLinks,
} from '#app/components/fullscreen-yt-embed.tsx'
import { Grid } from '#app/components/grid.tsx'
import { IconLink } from '#app/components/icon-link.tsx'
import {
	ArrowIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ClipboardIcon,
	GithubIcon,
	PlusIcon,
	XIcon,
} from '#app/components/icons.tsx'
import { FeaturedSection } from '#app/components/sections/featured-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { TeamStats } from '#app/components/team-stats.tsx'
import { H2, H3, H6, Paragraph } from '#app/components/typography.tsx'
import { getSocialImageWithPreTitle } from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { FavoriteToggle } from '#app/routes/resources/favorite.tsx'
import { HomeworkCompletionToggle } from '#app/routes/resources/homework-completion.tsx'
import { PodcastListenToggle } from '#app/routes/resources/podcast-listen.tsx'
import {
	type CWKEpisode,
	type CWKListItem,
	type KCDHandle,
} from '#app/types.ts'
import {
	getPodcastListenRankings,
	getTotalPodcastEpisodeListens,
} from '#app/utils/blog.server.ts'
import {
	getCWKEpisodePath,
	getFeaturedEpisode,
} from '#app/utils/chats-with-kent.ts'
import {
	getEpisodeFavoriteContentId,
	getEpisodeHomeworkContentId,
	getEpisodeListenContentId,
} from '#app/utils/favorites.ts'
import {
	formatDate,
	formatDuration,
	formatNumber,
	getDisplayUrl,
	getOrigin,
	getUrl,
	listify,
	reuseUsefulLoaderHeaders,
	typedBoolean,
	useCapturedRouteError,
} from '#app/utils/misc-react.tsx'
import {
	getEpisodeHomeworkCompletions,
	getEpisodePodcastListens,
	prisma,
} from '#app/utils/prisma.server.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import { getClientSession } from '#app/utils/client.server.ts'
import { type SerializeFrom } from '#app/utils/serialize-from.ts'
import { getUser } from '#app/utils/session.server.ts'
import { getSeasons } from '#app/utils/simplecast.server.ts'
import { getRankingLeader } from '#app/utils/team-rankings.ts'
import { Themed } from '#app/utils/theme.tsx'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/$season.$episode_.$slug'

export const handle: KCDHandle = {
	getSitemapEntries: serverOnly$(async (request: Request) => {
		const seasons = await getSeasons({ request })
		return seasons.flatMap((season) => {
			return season.episodes.map((episode) => {
				const s = String(season.seasonNumber).padStart(2, '0')
				const e = String(episode.episodeNumber).padStart(2, '0')
				return {
					route: `/chats/${s}/${e}/${episode.slug}`,
					changefreq: 'weekly',
					lastmod: new Date(episode.updatedAt).toISOString(),
					priority: 0.4,
				}
			})
		})
	}),
}

export const meta: Route.MetaFunction = ({ data, matches }) => {
	const episode = data?.episode

	const rootMatch = matches.find((match) => match?.id === 'root')
	const requestInfo = (
		rootMatch?.data as SerializeFrom<RootLoaderType> | undefined
	)?.requestInfo
	if (!episode) {
		return [{ title: 'Chats with Kent Episode not found' }]
	}
	const {
		description,
		image,
		mediaUrl,
		simpleCastId,
		episodeNumber,
		seasonNumber,
	} = episode
	const title = `${episode.title} | Chats with Kent Podcast | ${episodeNumber}`
	const playerUrl = `https://player.simplecast.com/${simpleCastId}`
	return [
		...getSocialMetas({
			title,
			description,
			keywords: `chats with kent, kent c. dodds, ${
				episode.meta?.keywords ?? ''
			}`,
			url: getUrl(requestInfo),
			image: getSocialImageWithPreTitle({
				title: episode.title,
				preTitle: 'Check out this Podcast',
				featuredImage: image,
				url: getDisplayUrl({
					origin: getOrigin(requestInfo),
					path: getCWKEpisodePath({ seasonNumber, episodeNumber }),
				}),
			}),
		}),
		{ 'twitter:card': 'player' },
		{ 'twitter:player': playerUrl },
		{ 'twitter:player:width': '436' },
		{ 'twitter:player:height': '196' },
		{ 'twitter:player:stream': mediaUrl },
		{ 'twitter:player:stream:content_type': 'audio/mpeg' },
	]
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const timings = {}
	const seasonNumber = Number(params.season)
	const episodeParam =
		'episode' in params
			? params.episode
			: (params as { episode_?: string }).episode_
	if (!episodeParam) {
		throw new Response(`Episode param missing`, { status: 404 })
	}
	const episodeNumber = Number(episodeParam)
	const [user, seasons] = await Promise.all([
		getUser(request, { timings }),
		getSeasons({ request, timings }),
	])
	const clientSession = await getClientSession(request, user)
	const clientId = clientSession.getClientId()
	const season = seasons.find((s) => s.seasonNumber === seasonNumber)
	if (!season) {
		throw new Response(`Season ${seasonNumber} not found`, { status: 404 })
	}
	const episode = season.episodes.find((e) => e.episodeNumber === episodeNumber)
	if (!episode) {
		throw new Response(`Episode ${episodeNumber} not found`, { status: 404 })
	}

	// we don't actually need the slug, but we'll redirect them to the place
	// with the slug so the URL looks correct.
	if (episode.slug !== params.slug) {
		return redirect(`/chats/${params.season}/${episodeParam}/${episode.slug}`)
	}

	const favoriteContentType = 'chats-with-kent-episode' as const
	const favoriteContentId = getEpisodeFavoriteContentId({
		seasonNumber: episode.seasonNumber,
		episodeNumber: episode.episodeNumber,
	})
	const [favorite, listenedEpisodeIds, completedHomeworkIds, listenRankings, totalListens] =
		await Promise.all([
			user
				? prisma.favorite.findUnique({
						where: {
							userId_contentType_contentId: {
								userId: user.id,
								contentType: favoriteContentType,
								contentId: favoriteContentId,
							},
						},
						select: { id: true },
					})
				: Promise.resolve(null),
			getEpisodePodcastListens({ userId: user?.id }),
			getEpisodeHomeworkCompletions({
				seasonNumber: episode.seasonNumber,
				episodeNumber: episode.episodeNumber,
				...(user ? { userId: user.id } : clientId ? { clientId } : {}),
			}),
		getPodcastListenRankings({
			request,
			seasonNumber: episode.seasonNumber,
			episodeNumber: episode.episodeNumber,
			timings,
		}),
		getTotalPodcastEpisodeListens({
			request,
			seasonNumber: episode.seasonNumber,
			episodeNumber: episode.episodeNumber,
			timings,
		}),
		])
	const homeworkItems = episode.homeworkHTMLs.map((homeworkHTML, itemIndex) => {
		const id = getEpisodeHomeworkContentId({
			seasonNumber: episode.seasonNumber,
			episodeNumber: episode.episodeNumber,
			itemIndex,
		})
		return {
			id,
			itemIndex,
			homeworkHTML,
			isCompleted: completedHomeworkIds.has(id),
		}
	})

	return json(
		{
			prevEpisode:
				season.episodes.find((e) => e.episodeNumber === episodeNumber - 1) ??
				null,
			nextEpisode:
				season.episodes.find((e) => e.episodeNumber === episodeNumber + 1) ??
				null,
			featured: getFeaturedEpisode(
				season.episodes.filter((e) => episode !== e),
			),
			episode,
			homeworkItems,
			isListened: listenedEpisodeIds.has(
				getEpisodeListenContentId({
					seasonNumber: episode.seasonNumber,
					episodeNumber: episode.episodeNumber,
				}),
			),
			listenRankings,
			totalListens: formatNumber(totalListens),
			leadingTeam: getRankingLeader(listenRankings)?.team ?? null,
			favoriteContentType,
			favoriteContentId,
			isFavorite: Boolean(favorite),
		},
		{
			headers: await clientSession.getHeaders({
				'Cache-Control': 'private, max-age=600',
				Vary: 'Cookie',
				'Server-Timing': getServerTimeHeader(timings),
			}),
		},
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const links: LinksFunction = () => {
	return youTubeEmbedLinks()
}

function EpisodeListenSummary({
	episodeTitle,
	leadingTeam,
}: {
	episodeTitle: string
	leadingTeam: string | null
}) {
	if (!leadingTeam) {
		return (
			<Paragraph prose={false} className="text-secondary mt-4">
				No team has claimed this episode yet. Be the first to self-report that
				you listened.
			</Paragraph>
		)
	}

	return (
		<Paragraph prose={false} className="text-secondary mt-4">
			The{' '}
			<strong
				className={`text-team-current set-color-team-current-${leadingTeam.toLowerCase()}`}
			>
				{leadingTeam.toLowerCase()}
			</strong>{' '}
			team currently owns this episode. Self-reporting that you listened to{' '}
			<strong>{episodeTitle}</strong> affects the ranking.
		</Paragraph>
	)
}

function Homework({
	homeworkItems,
	seasonNumber,
	episodeNumber,
}: {
	homeworkItems: Array<{
		id: string
		itemIndex: number
		homeworkHTML: string
		isCompleted: boolean
	}>
	seasonNumber: number
	episodeNumber: number
}) {
	return (
		<div className="bg-secondary w-full rounded-lg p-10 pb-16">
			<H6 as="h4" className="mb-8 inline-flex items-center space-x-4">
				<ClipboardIcon />
				<span>Homework</span>
			</H6>

			<ul className="text-primary html -mb-10 text-lg font-medium">
				{homeworkItems.map((homeworkItem) => (
					<li
						key={homeworkItem.id}
						className="border-secondary border-t pt-8 pb-10"
					>
						<HomeworkToggle
							seasonNumber={seasonNumber}
							episodeNumber={episodeNumber}
							homeworkItem={homeworkItem}
						/>
					</li>
				))}
			</ul>
		</div>
	)
}

function HomeworkToggle({
	seasonNumber,
	episodeNumber,
	homeworkItem,
}: {
	seasonNumber: number
	episodeNumber: number
	homeworkItem: {
		id: string
		itemIndex: number
		homeworkHTML: string
		isCompleted: boolean
	}
}) {
	return (
		<HomeworkCompletionToggle
			seasonNumber={seasonNumber}
			episodeNumber={episodeNumber}
			itemIndex={homeworkItem.itemIndex}
			initialCompleted={homeworkItem.isCompleted}
		>
			<div dangerouslySetInnerHTML={{ __html: homeworkItem.homeworkHTML }} />
		</HomeworkCompletionToggle>
	)
}

function Resources({ resources = [] }: { resources: CWKEpisode['resources'] }) {
	return (
		<div className="bg-secondary rounded-lg p-10 pb-16">
			<h4 className="text-primary mb-8 inline-flex items-center text-xl font-medium">
				Resources
			</h4>

			<ul className="text-secondary space-y-8 text-lg font-medium lg:space-y-2">
				{resources.map((resource) => (
					<li key={resource.url}>
						<a
							href={resource.url}
							className="hover:text-team-current focus:text-team-current transition focus:outline-none"
						>
							<span>{resource.name}</span>
							<span className="mt-1 ml-4 inline-block align-top">
								<ArrowIcon size={26} direction="top-right" />
							</span>
						</a>
					</li>
				))}
			</ul>
		</div>
	)
}

function Guests({ episode }: { episode: CWKEpisode }) {
	return (
		<>
			<h4 className="sr-only">Guests</h4>

			{episode.guests.map((guest) => (
				<div
					key={guest.name}
					className="text-secondary bg-secondary flex flex-col rounded-lg p-10 pb-16 md:flex-row md:items-center md:pb-12"
				>
					<img
						src={episode.image}
						alt={guest.name}
						className="mr-8 mb-6 h-20 w-20 flex-none rounded-lg object-cover md:mb-0"
					/>
					<div className="mb-6 w-full md:mb-0 md:flex-auto">
						<div className="text-primary mb-2 text-xl leading-none font-medium">
							{guest.name}
						</div>
						<p className="text-xl leading-none">{guest.company}</p>
					</div>
					<div className="flex flex-none space-x-4">
						{guest.x ? (
							<a
								target="_blank"
								rel="noreferrer noopener"
								href={`https://x.com/${guest.x}`}
								aria-label="𝕏 profile"
							>
								<XIcon size={32} />
							</a>
						) : null}

						{guest.github ? (
							<a
								target="_blank"
								rel="noreferrer noopener"
								href={`https://github.com/${guest.github}`}
								aria-label="github profile"
							>
								<GithubIcon size={32} />
							</a>
						) : null}
					</div>
				</div>
			))}
		</>
	)
}

function Transcript({
	transcriptHTML,
}: {
	transcriptHTML: CWKEpisode['transcriptHTML']
}) {
	const [collapsed, setCollapsed] = useState(true)

	// re-collapse the transcript when changing the episode
	const location = useLocation()
	React.useEffect(() => {
		setCollapsed(true)
	}, [location.key])

	return (
		<div className="bg-secondary col-span-full rounded-lg p-10 pb-16">
			<h4 className="text-primary mb-8 inline-flex items-center text-xl font-medium">
				Transcript
			</h4>

			<div
				className={clsx(
					'prose prose-light dark:prose-dark relative overflow-hidden',
					{
						'max-h-96': collapsed,
					},
				)}
			>
				<div dangerouslySetInnerHTML={{ __html: transcriptHTML }} />

				{collapsed ? (
					<div className="absolute bottom-0 h-48 w-full bg-gradient-to-b from-transparent to-gray-100 dark:to-gray-800" />
				) : null}
			</div>
			{collapsed ? (
				<button
					onClick={() => setCollapsed(false)}
					className="text-primary group mt-16 inline-flex items-center text-xl transition focus:outline-none"
				>
					<span>Read the full transcript</span>
					<span className="group-hover:border-primary group-focus:border-primary ml-8 inline-flex h-14 w-14 flex-none items-center justify-center rounded-full border-2 border-gray-200 p-1 dark:border-gray-600">
						<PlusIcon />
					</span>
				</button>
			) : null}
		</div>
	)
}

function EpisodeVideo({
	youtubeVideoId,
	title,
}: {
	youtubeVideoId: string
	title: string
}) {
	return (
		<div className="col-span-full lg:col-span-8 lg:col-start-3">
			<div className="overflow-hidden rounded-lg bg-black">
				<LiteYouTubeEmbed
					id={youtubeVideoId}
					title={`${title} video`}
					announce="Play video"
					alwaysLoadIframe={true}
					params={new URLSearchParams({
						rel: '0',
						modestbranding: '1',
					}).toString()}
				/>
			</div>
		</div>
	)
}

const imageVariants = {
	initial: {
		opacity: 1,
	},
	hover: {
		opacity: 0.2,
	},
}
const arrowVariants = {
	initial: {
		opacity: 0,
	},
	hover: {
		scale: 2,
		opacity: 1,
	},
	tapLeft: {
		x: -5,
		opacity: 0,
	},
	tapRight: {
		x: 5,
		opacity: 1,
	},
}

const MotionLink = motion(Link)

function PrevNextButton({
	episodeListItem,
	direction,
}: {
	episodeListItem?: CWKListItem | null
	direction: 'prev' | 'next'
}) {
	if (!episodeListItem) {
		return <div /> // return empty div for easy alignment
	}

	return (
		<MotionLink
			initial="initial"
			whileHover="hover"
			whileFocus="hover"
			whileTap={direction === 'next' ? 'tapRight' : 'tapLeft'}
			animate="initial"
			preventScrollReset
			to={getCWKEpisodePath(episodeListItem)}
			className={clsx('flex items-start focus:outline-none', {
				'flex-row-reverse': direction === 'next',
			})}
		>
			<div className="relative mt-1 h-12 w-12 flex-none overflow-hidden rounded-lg">
				<motion.img
					variants={imageVariants}
					transition={{ duration: 0.2 }}
					className="h-full w-full object-cover"
					src={episodeListItem.image}
					alt={episodeListItem.title}
				/>
				<motion.div
					variants={arrowVariants}
					className="text-primary absolute inset-0 flex origin-center items-center justify-center"
				>
					{direction === 'next' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
				</motion.div>
			</div>
			<div
				className={clsx('flex flex-col', {
					'ml-4 items-start': direction === 'prev',
					'mr-4 items-end text-right': direction === 'next',
				})}
			>
				<p className="text-primary text-lg font-medium">
					{episodeListItem.guests[0]?.name}
				</p>
				<h6 className="text-secondary text-lg font-medium">
					{`Episode ${episodeListItem.episodeNumber}`}
				</h6>
			</div>
		</MotionLink>
	)
}

export default function PodcastDetail({ loaderData }: Route.ComponentProps) {
	const { requestInfo } = useRootData()
	const {
		episode,
		homeworkItems,
		featured,
		nextEpisode,
		prevEpisode,
		isListened,
		listenRankings,
		totalListens,
		leadingTeam,
		favoriteContentType,
		favoriteContentId,
		isFavorite,
	} = loaderData
	const permalink = `${requestInfo.origin}${getCWKEpisodePath(episode)}`

	return (
		<div
			className={
				leadingTeam
					? `set-color-team-current-${leadingTeam.toLowerCase()}`
					: undefined
			}
		>
			<Grid className="mt-24 mb-10 lg:mb-24">
				<div className="col-span-full flex justify-between gap-6 lg:col-span-8 lg:col-start-3">
					<BackLink to="/chats">Back to overview</BackLink>
					<TeamStats
						totalCount={totalListens}
						rankings={listenRankings}
						direction="down"
						pull="right"
						totalLabel="listens"
						whatsThisHref="/teams#listen-rankings"
					/>
				</div>
			</Grid>

			<Grid as="header" className="mb-12">
				<div className="col-span-full lg:col-span-8 lg:col-start-3">
					<H2>{episode.title}</H2>
					<H6 variant="secondary" as="div" className="mt-3">
						Published{' '}
						<time dateTime={episode.publishedAt}>
							{formatDate(episode.publishedAt)}
						</time>
					</H6>
					<EpisodeListenSummary
						episodeTitle={episode.title}
						leadingTeam={leadingTeam}
					/>
				</div>
			</Grid>

			<Grid as="main" className="mb-24 lg:mb-64">
				<div className="col-span-full mb-16 lg:col-span-8 lg:col-start-3">
					<Themed
						// changing the theme while the player is going will cause it to
						// unload the player in the one theme and load it in the other
						// which is annoying.
						initialOnly={true}
						dark={
							<iframe
								className="mb-4"
								title="player"
								height="200px"
								width="100%"
								frameBorder="no"
								scrolling="no"
								seamless
								src={`https://player.simplecast.com/${episode.simpleCastId}?dark=true`}
							/>
						}
						light={
							<iframe
								className="mb-4"
								title="player"
								height="200px"
								width="100%"
								frameBorder="no"
								scrolling="no"
								seamless
								src={`https://player.simplecast.com/${episode.simpleCastId}?dark=false`}
							/>
						}
					/>

					<div className="flex justify-between">
						<PrevNextButton episodeListItem={prevEpisode} direction="prev" />
						<PrevNextButton episodeListItem={nextEpisode} direction="next" />
					</div>
				</div>

				{episode.youtubeVideoId ? (
					<>
						<EpisodeVideo
							youtubeVideoId={episode.youtubeVideoId}
							title={episode.title}
						/>
						<Spacer size="3xs" className="col-span-full" />
					</>
				) : null}

				{episode.descriptionHTML ? (
					<>
						<H3
							className="col-span-full lg:col-span-8 lg:col-start-3"
							dangerouslySetInnerHTML={{ __html: episode.descriptionHTML }}
						/>

						<Spacer size="3xs" className="col-span-full" />
					</>
				) : null}

				<div className="col-span-full lg:col-span-8 lg:col-start-3">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
							<PodcastListenToggle
								contentId={getEpisodeListenContentId({
									seasonNumber: episode.seasonNumber,
									episodeNumber: episode.episodeNumber,
								})}
								initialListened={isListened}
							/>
							<FavoriteToggle
								contentType={favoriteContentType}
								contentId={favoriteContentId}
								initialIsFavorite={isFavorite}
								label="Favorite episode"
							/>
						</div>
						<IconLink
							className="flex gap-2"
							target="_blank"
							rel="noreferrer noopener"
							href={`https://x.com/intent/post?${new URLSearchParams({
								url: permalink,
								text: `I just listened to "${episode.title}" with ${listify(
									episode.guests
										.map((g) => (g.x ? `@${g.x}` : null))
										.filter(typedBoolean),
								)} on the Call Kent Podcast 🎙 by @kentcdodds`,
							})}`}
						>
							<XIcon title="Post this" />
							<span>Post this episode</span>
						</IconLink>
					</div>
				</div>

				<Spacer size="2xs" className="col-span-full" />

				<Paragraph
					as="div"
					className="col-span-full space-y-6 lg:col-span-8 lg:col-start-3"
					dangerouslySetInnerHTML={{ __html: episode.summaryHTML }}
				/>

				<Spacer size="3xs" className="col-span-full" />

				<div className="col-span-full space-y-4 lg:col-span-8 lg:col-start-3">
					{homeworkItems.length > 0 ? (
						<Homework
							homeworkItems={homeworkItems}
							seasonNumber={episode.seasonNumber}
							episodeNumber={episode.episodeNumber}
						/>
					) : null}
					{episode.resources.length > 0 ? (
						<Resources resources={episode.resources} />
					) : null}
					<Guests episode={episode} />
					{episode.transcriptHTML ? (
						<Transcript transcriptHTML={episode.transcriptHTML} />
					) : null}
				</div>
			</Grid>

			<Grid>
				<div className="col-span-full mb-20 flex flex-col space-y-10 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
					<div className="space-y-2 lg:space-y-0">
						<H2>Sweet episode right?</H2>
						<H2 variant="secondary" as="p">
							You will love this one too.{' '}
						</H2>
					</div>

					<ArrowLink to="/chats" direction="right">
						See all episodes
					</ArrowLink>
				</div>
			</Grid>

			{featured ? (
				<FeaturedSection
					cta="Listen to this episode"
					caption="Featured episode"
					subTitle={`Season ${featured.seasonNumber} Episode ${
						featured.episodeNumber
					} — ${formatDate(featured.publishedAt)} — ${formatDuration(
						featured.duration,
					)}`}
					title={featured.title}
					href={getCWKEpisodePath(featured)}
					imageUrl={featured.image}
					imageAlt={listify(featured.guests.map((g) => g.name))}
				/>
			) : null}
		</div>
	)
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	if (isRouteErrorResponse(error)) {
		console.error('CatchBoundary', error)
		if (error.status === 404) {
			return <FourOhFour />
		}
		throw new Error(`Unhandled error: ${error.status}`)
	}
}
