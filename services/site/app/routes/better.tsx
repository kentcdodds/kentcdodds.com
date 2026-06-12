import { type ReactNode } from 'react'
import {
	data,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from 'react-router'
import { ArrowLink } from '#app/components/arrow-button.tsx'
import { ButtonLink } from '#app/components/button.tsx'
import {
	LiteYouTubeEmbed,
	links as youTubeEmbedLinks,
} from '#app/components/fullscreen-yt-embed.tsx'
import { Grid } from '#app/components/grid.tsx'
import { YoutubeIcon } from '#app/components/icons.tsx'
import { PodcastSubs } from '#app/components/podcast-subs.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { H2, H3, H6, Paragraph } from '#app/components/typography.tsx'
import { externalLinks } from '#app/external-links.tsx'
import {
	getImgProps,
	getSocialImageWithPreTitle,
	images,
} from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import {
	type BetterWithKentEpisode,
	getBetterWithKentEpisodes,
} from '#app/utils/better-with-kent.server.ts'
import {
	formatDate,
	getDisplayUrl,
	getUrl,
	reuseUsefulLoaderHeaders,
} from '#app/utils/misc.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import { getServerTimeHeader, type Timings } from '#app/utils/timing.server.ts'
import { type Route } from './+types/better'

const epicProductEngineerUrl =
	'https://www.epicproduct.engineer/become-an-epic-product-engineer-podcast'

// The Better with Kent show artwork (the original Transistor upload, which the
// podcast feed's <itunes:image> imgproxy URL points at). Cloudinary fetches and
// caches it for the social image.
const betterWithKentArtworkUrl =
	'https://img-upload-production.transistor.fm/cfe9ede66d04d8e7e3d1f8f824dbe2b1.jpg'

export async function loader({ request }: Route.LoaderArgs) {
	const timings: Timings = {}
	const episodes = await getBetterWithKentEpisodes({ request, timings })
	return data(
		{ episodes },
		{
			headers: {
				'Cache-Control': 'public, max-age=900',
				'Server-Timing': getServerTimeHeader(timings),
			},
		},
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const links: LinksFunction = () => youTubeEmbedLinks()

export const meta: MetaFunction<typeof loader, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	return getSocialMetas({
		title: 'Better with Kent',
		description:
			'Durable skills for people who ship software. A solo show from Kent C. Dodds — one skill per episode, with homework. Watch on YouTube or listen wherever you get podcasts.',
		url: getUrl(requestInfo),
		image: getSocialImageWithPreTitle({
			url: getDisplayUrl(requestInfo),
			featuredImage: betterWithKentArtworkUrl,
			featuredImageStyle: 'square',
			preTitle: 'A solo show from Kent C. Dodds',
			title: 'Durable skills for people who ship software',
		}),
	})
}

function getWatchUrl(videoId: string) {
	return `https://www.youtube.com/watch?v=${videoId}`
}

function SubscribeButton({
	children = 'Subscribe on YouTube',
	variant = 'primary',
}: {
	children?: ReactNode
	variant?: 'primary' | 'secondary'
}) {
	return (
		<ButtonLink
			variant={variant}
			href={externalLinks.betterWithKentYouTube}
			target="_blank"
			rel="noreferrer noopener"
		>
			<YoutubeIcon size={28} />
			<span className="pl-1">{children}</span>
		</ButtonLink>
	)
}

function EpisodeCard({ episode }: { episode: BetterWithKentEpisode }) {
	return (
		<a
			className="focus-ring group block h-full w-full rounded-lg"
			href={getWatchUrl(episode.videoId)}
			target="_blank"
			rel="noreferrer noopener"
		>
			<div className="aspect-video w-full overflow-hidden rounded-lg">
				<img
					loading="lazy"
					alt={episode.title}
					src={`https://i.ytimg.com/vi/${episode.videoId}/hq720.jpg`}
					className="h-full w-full object-cover transition motion-safe:group-hover:scale-105 motion-safe:group-focus:scale-105"
				/>
			</div>
			<div className="py-6">
				<Paragraph
					prose={false}
					className="mb-2 text-base"
					textColorClassName="text-secondary"
				>
					{formatDate(episode.publishedAt)}
				</Paragraph>
				<H3 as="p" className="mb-3">
					{episode.title}
				</H3>
				{episode.description ? (
					<Paragraph className="line-clamp-3">{episode.description}</Paragraph>
				) : null}
			</div>
		</a>
	)
}

export default function BetterRoute({
	loaderData: { episodes },
}: Route.ComponentProps) {
	const [latestEpisode, ...earlierEpisodes] = episodes

	return (
		<>
			<HeroSection
				title="Better with Kent"
				subtitle="Durable skills for people who ship software."
				imageBuilder={images.microphone}
				arrowUrl="#latest-episode"
				arrowLabel="Watch the latest episode"
				action={<SubscribeButton />}
			/>

			<main>
				{latestEpisode ? (
					<Grid className="mb-24 lg:mb-48" id="latest-episode" rowGap>
						<div className="col-span-full lg:col-span-7">
							<div className="overflow-hidden rounded-lg bg-black">
								<LiteYouTubeEmbed
									id={latestEpisode.videoId}
									title={latestEpisode.title}
									announce="Play video"
									// the default poster resolution logic loads from
									// img.youtube.com which our CSP img-src does not allow, so we
									// point straight at the i.ytimg.com thumbnail instead.
									thumbnail={`https://i.ytimg.com/vi/${latestEpisode.videoId}/maxresdefault.jpg`}
									params="rel=0"
								/>
							</div>
						</div>
						<div className="col-span-full lg:col-span-4 lg:col-start-9">
							<H6 as="h2" className="mb-4">
								Latest episode
							</H6>
							<H3 as="p" className="mb-2">
								{latestEpisode.title}
							</H3>
							<Paragraph
								prose={false}
								className="mb-6 text-base"
								textColorClassName="text-secondary"
							>
								{formatDate(latestEpisode.publishedAt)}
							</Paragraph>
							{latestEpisode.description ? (
								<Paragraph className="mb-8">
									{latestEpisode.description}
								</Paragraph>
							) : null}
							<ArrowLink
								href={getWatchUrl(latestEpisode.videoId)}
								direction="top-right"
							>
								Watch on YouTube
							</ArrowLink>
						</div>
					</Grid>
				) : (
					<Grid className="mb-24 lg:mb-48" id="latest-episode">
						<div className="bg-secondary col-span-full rounded-lg px-8 py-12 lg:px-12">
							<H3 as="p" className="mb-4">
								Episodes live on YouTube.
							</H3>
							<Paragraph className="mb-8">
								Head over to the Better with Kent playlist to watch every
								episode.
							</Paragraph>
							<SubscribeButton variant="secondary">
								Watch on YouTube
							</SubscribeButton>
						</div>
					</Grid>
				)}

				<Grid className="mb-24 lg:mb-48">
					<div className="col-span-full lg:col-span-6 lg:col-start-1">
						<div className="mb-12 aspect-[4/3] lg:mb-0">
							<img
								{...getImgProps(images.kentSmilingWithLaptop, {
									className: 'rounded-lg object-cover',
									widths: [410, 650, 820, 1230, 1640, 2460],
									sizes: [
										'(max-width: 1023px) 80vw',
										'(min-width:1024px) and (max-width:1620px) 40vw',
										'630px',
									],
									transformations: {
										resize: {
											type: 'fill',
											aspectRatio: '4:3',
										},
									},
								})}
							/>
						</div>
					</div>

					<div className="col-span-full lg:col-span-5 lg:col-start-8 lg:row-start-1">
						<H2 className="mb-10">
							One durable skill per episode, straight to camera.
						</H2>
						<Paragraph className="mb-8">
							AI keeps making implementation cheaper. That doesn't make you less
							valuable — it moves the value. Knowing what to build, what to fix
							first, and what your users actually need is the work that stays
							scarce. That's what this show is about.
						</Paragraph>
						<Paragraph className="mb-8">
							Each episode I take one skill, framework, or hard-earned lesson
							from real product work and land it in about fifteen minutes. No
							tool demos, no hype. And every episode ends with homework you can
							apply to your own backlog the same day.
						</Paragraph>
						<Paragraph>
							New episodes publish on YouTube first, with audio everywhere you
							already listen.
						</Paragraph>
					</div>
				</Grid>

				<Grid className="mb-24 lg:mb-48">
					<div className="col-span-full mb-12 hidden lg:col-span-4 lg:mb-0 lg:block">
						<H6 as="h2">Why this show?</H6>
					</div>
					<div className="col-span-full mb-12 lg:col-span-8 lg:mb-20">
						<H2 as="p" className="mb-3">
							Shipping code is getting easier. Shipping the right thing isn't.
						</H2>
						<H2 as="p" variant="secondary">
							The engineers who stay valuable are the ones who get better at
							judgment, prioritization, and understanding the people they build
							for.
						</H2>
					</div>
					<div className="col-span-full lg:col-span-4 lg:col-start-5 lg:pr-12">
						<H6 as="h3" className="mb-4">
							The expensive mistake has changed.
						</H6>
						<Paragraph className="mb-16">
							When implementation was slow, bugs were the costly failure. Now
							agents can build the wrong thing faster than ever — and the wrong
							thing at speed is still the wrong thing.
						</Paragraph>
					</div>
					<div className="col-span-full lg:col-span-4 lg:col-start-9 lg:pr-12">
						<H6 as="h3" className="mb-4">
							These skills outlast the toolchain.
						</H6>
						<Paragraph className="mb-16">
							Frameworks and models churn. Problem clarity, prioritization,
							empathy, and ownership transfer across every stack, team, and
							product cycle.
						</Paragraph>
					</div>
				</Grid>

				{earlierEpisodes.length ? (
					<>
						<HeaderSection
							title="Catch up on the show."
							subTitle="Every episode stands alone — start anywhere."
							className="mb-16"
						/>
						<Grid className="mb-12" rowGap>
							{earlierEpisodes.map((episode) => (
								<div
									key={episode.videoId}
									className="col-span-full md:col-span-4"
								>
									<EpisodeCard episode={episode} />
								</div>
							))}
						</Grid>
						<Grid className="mb-24 lg:mb-48">
							<div className="col-span-full">
								<ArrowLink
									href={externalLinks.betterWithKentPlaylist}
									direction="top-right"
								>
									Browse all episodes on YouTube
								</ArrowLink>
							</div>
						</Grid>
					</>
				) : null}

				<HeaderSection
					title="Never miss an episode."
					subTitle="YouTube is the home of the show. Prefer audio? It's wherever you listen."
					className="mb-16"
				/>
				<Grid className="mb-24 lg:mb-48" rowGap>
					<div className="col-span-full">
						<SubscribeButton />
					</div>
					<PodcastSubs
						apple={externalLinks.betterWithKentApple}
						pocketCasts={externalLinks.betterWithKentPocketCasts}
						spotify={externalLinks.betterWithKentSpotify}
						rss={externalLinks.betterWithKentRSS}
					/>
				</Grid>

				<Grid className="mb-24 lg:mb-48">
					<div className="col-span-full lg:col-span-6 lg:col-start-7">
						<div className="mb-12 lg:mb-0">
							<img
								loading="lazy"
								{...getImgProps(images.microphoneWithHands, {
									className: 'rounded-lg object-cover',
									widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
									sizes: [
										'(max-width: 1023px) 80vw',
										'(min-width: 1024px) and (max-width: 1620px) 40vw',
										'650px',
									],
									transformations: {
										resize: {
											type: 'fill',
											aspectRatio: '3:4',
										},
									},
								})}
							/>
						</div>
					</div>

					<div className="col-span-full lg:col-span-5 lg:col-start-1 lg:row-start-1">
						<H2 className="mb-10">Want guest conversations too?</H2>
						<H2 variant="secondary" as="p" className="mb-12">
							Better with Kent is just me. For interviews with engineers who
							pair technical depth with product judgment, check out Become an
							Epic Product Engineer.
						</H2>
						<ArrowLink href={epicProductEngineerUrl} direction="top-right">
							Become an Epic Product Engineer
						</ArrowLink>
					</div>
				</Grid>

				<Grid className="mb-24 lg:mb-48">
					<div className="col-span-full lg:col-span-5 lg:col-start-1">
						<H2 className="mb-8">Get better at the work beyond the code.</H2>
						<H2 variant="secondary" as="p" className="mb-14">
							Subscribe on YouTube so the next episode finds you.
						</H2>
						<SubscribeButton />
					</div>
					<div className="col-span-full mt-12 lg:col-span-4 lg:col-start-8 lg:mt-0">
						<img
							loading="lazy"
							{...getImgProps(images.microphone, {
								className: 'object-contain',
								widths: [420, 512, 840, 1260, 1024, 1680, 2520],
								sizes: [
									'(max-width: 1023px) 80vw',
									'(min-width: 1024px) and (max-width: 1620px) 40vw',
									'630px',
								],
							})}
						/>
					</div>
				</Grid>
			</main>
		</>
	)
}
