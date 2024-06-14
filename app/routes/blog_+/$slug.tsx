import {
	json,
	type DataFunctionArgs,
	type HeadersFunction,
} from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import { clsx } from 'clsx'
import * as React from 'react'
import { serverOnly$ } from 'vite-env-only'
import { markAsRead } from '../action+/mark-as-read.tsx'
import { ArrowLink, BackLink } from '~/components/arrow-button.tsx'
import { BlurrableImage } from '~/components/blurrable-image.tsx'
import { CourseCard } from '~/components/course-card.tsx'
import { GeneralErrorBoundary } from '~/components/error-boundary.tsx'
import { FourHundred, FourOhFour } from '~/components/errors.tsx'
import { Grid } from '~/components/grid.tsx'
import { BlogSection } from '~/components/sections/blog-section.tsx'
import { HeaderSection } from '~/components/sections/header-section.tsx'
import { Spacer } from '~/components/spacer.tsx'
import { TeamStats } from '~/components/team-stats.tsx'
import { H2, H6, Paragraph } from '~/components/typography.tsx'
import { WorkshopCard } from '~/components/workshop-card.tsx'
import { externalLinks } from '~/external-links.tsx'
import { getImageBuilder, getImgProps, images } from '~/images.tsx'
import { type KCDHandle, type MdxListItem, type Team } from '~/types.ts'
import {
	getBlogReadRankings,
	getBlogRecommendations,
	getTotalPostReads,
	type ReadRankings,
} from '~/utils/blog.server.ts'
import { getRankingLeader } from '~/utils/blog.ts'
import { getBlogMdxListItems, getMdxPage } from '~/utils/mdx.server.ts'
import {
	getBannerAltProp,
	getBannerTitleProp,
	mdxPageMeta,
	useMdxComponent,
} from '~/utils/mdx.tsx'
import {
	formatNumber,
	requireValidSlug,
	reuseUsefulLoaderHeaders,
	typedBoolean,
} from '~/utils/misc.tsx'
import { teamEmoji, useTeam } from '~/utils/team-provider.tsx'
import { getServerTimeHeader } from '~/utils/timing.server.ts'
import { useRootData } from '~/utils/use-root-data.ts'
import { getScheduledEvents } from '~/utils/workshop-tickets.server.ts'
import { getWorkshops } from '~/utils/workshops.server.ts'

const handleId = 'blog-post'
export const handle: KCDHandle = {
	id: handleId,
	getSitemapEntries: serverOnly$(async (request) => {
		const pages = await getBlogMdxListItems({ request })
		return pages
			.filter((page) => !page.frontmatter.draft)
			.map((page) => {
				return { route: `/blog/${page.slug}`, priority: 0.7 }
			})
	}),
}

type CatchData = {
	recommendations: Array<MdxListItem>
	readRankings: ReadRankings
	totalReads: string
	leadingTeam: Team | null
}

export async function loader({ request, params }: DataFunctionArgs) {
	requireValidSlug(params.slug)
	const timings = {}

	const page = await getMdxPage(
		{ contentDir: 'blog', slug: params.slug },
		{ request, timings },
	)

	const [recommendations, readRankings, totalReads, workshops, workshopEvents] =
		await Promise.all([
			getBlogRecommendations({
				request,
				timings,
				limit: 3,
				keywords: [
					...(page?.frontmatter.categories ?? []),
					...(page?.frontmatter.meta?.keywords ?? []),
				],
				exclude: [params.slug],
			}),
			getBlogReadRankings({ request, slug: params.slug, timings }),
			getTotalPostReads({ request, slug: params.slug, timings }),
			getWorkshops({ request, timings }),
			getScheduledEvents({ request, timings }),
		])

	const catchData: CatchData = {
		recommendations,
		readRankings,
		totalReads: formatNumber(totalReads),
		leadingTeam: getRankingLeader(readRankings)?.team ?? null,
	}
	const headers = {
		'Cache-Control': 'private, max-age=3600',
		Vary: 'Cookie',
		'Server-Timing': getServerTimeHeader(timings),
	}
	if (!page) {
		throw json(catchData, { status: 404, headers })
	}

	const topics = [
		...(page.frontmatter.categories ?? []),
		...(page.frontmatter.meta?.keywords ?? []),
	]
	const relevantWorkshops = workshops.filter((workshop) => {
		const workshopTopics = [
			...workshop.categories,
			...(workshop.meta.keywords ?? []),
		]
		return (
			workshopTopics.some((t) => topics.includes(t)) &&
			(workshop.events.length ||
				workshopEvents.some(
					(event) => event.metadata.workshopSlug === workshop.slug,
				))
		)
	})

	const data = {
		page,
		workshops: relevantWorkshops,
		workshopEvents,
		...catchData,
	}
	return json(data, { status: 200, headers })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta = mdxPageMeta

function useOnRead({
	parentElRef,
	time,
	onRead,
}: {
	parentElRef: React.RefObject<HTMLElement | null>
	time: number | undefined
	onRead: () => void
}) {
	React.useEffect(() => {
		const parentEl = parentElRef.current
		if (!parentEl || !time) return

		const visibilityEl = document.createElement('div')

		let scrolledTheMain = false
		const observer = new IntersectionObserver((entries) => {
			const isVisible = entries.some((entry) => {
				return entry.target === visibilityEl && entry.isIntersecting
			})
			if (isVisible) {
				scrolledTheMain = true
				maybeMarkAsRead()
				observer.disconnect()
				visibilityEl.remove()
			}
		})

		let startTime = new Date().getTime()
		let timeoutTime = time * 0.6
		let timerId: ReturnType<typeof setTimeout>
		let timerFinished = false
		function startTimer() {
			timerId = setTimeout(() => {
				timerFinished = true
				document.removeEventListener('visibilitychange', handleVisibilityChange)
				maybeMarkAsRead()
			}, timeoutTime)
		}

		function handleVisibilityChange() {
			if (document.hidden) {
				clearTimeout(timerId)
				const timeElapsedSoFar = new Date().getTime() - startTime
				timeoutTime = timeoutTime - timeElapsedSoFar
			} else {
				startTime = new Date().getTime()
				startTimer()
			}
		}

		function maybeMarkAsRead() {
			if (timerFinished && scrolledTheMain) {
				cleanup()
				onRead()
			}
		}

		// dirty-up
		parentEl.append(visibilityEl)
		observer.observe(visibilityEl)
		startTimer()
		document.addEventListener('visibilitychange', handleVisibilityChange)

		function cleanup() {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			clearTimeout(timerId)
			observer.disconnect()
			visibilityEl.remove()
		}
		return cleanup
	}, [time, onRead, parentElRef])
}

function ArticleFooter({
	editLink,
	permalink,
	title = 'an awesome post',
	isDraft,
}: {
	editLink: string
	permalink: string
	title?: string
	isDraft: boolean
}) {
	const [team] = useTeam()
	const tweetMessage =
		team === 'UNKNOWN'
			? `I just read "${title}" by @kentcdodds\n\n`
			: `I just scored a point for the ${team.toLowerCase()} team ${
					teamEmoji[team]
				} by reading "${title}" by @kentcdodds\n\n`

	return (
		<Grid>
			<div className="col-span-full mb-12 flex flex-col flex-wrap justify-between gap-2 border-b border-gray-600 pb-12 text-lg font-medium text-slate-500 lg:col-span-8 lg:col-start-3 lg:flex-row lg:pb-6">
				<div className="flex space-x-5">
					<a
						className={clsx(
							'underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white',
							{ hidden: isDraft },
						)}
						target="_blank"
						rel="noreferrer noopener"
						href={`https://twitter.com/intent/tweet?${new URLSearchParams({
							url: permalink,
							text: tweetMessage,
						})}`}
					>
						Post this article
					</a>
				</div>

				<div className="flex">
					<a
						className={clsx(
							'underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white',
							{ hidden: isDraft },
						)}
						target="_blank"
						rel="noreferrer noopener"
						href={`https://twitter.com/search?${new URLSearchParams({
							q: permalink,
						})}`}
					>
						Discuss on 𝕏
					</a>
					<span
						className={clsx('mx-3 self-center text-xs', { hidden: isDraft })}
					>
						•
					</span>
					<a
						className="underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white"
						target="_blank"
						rel="noreferrer noopener"
						href={editLink}
					>
						Edit on GitHub
					</a>
				</div>
			</div>
			<div className="col-span-full lg:col-span-2 lg:col-start-3">
				<img
					loading="lazy"
					{...getImgProps(images.kentTransparentProfile, {
						className: 'mb-8 w-32',
						widths: [128, 256, 512],
						sizes: ['8rem'],
					})}
				/>
			</div>
			<div className="lg:col-start:5 col-span-full lg:col-span-6">
				<H6 as="div">Written by Kent C. Dodds</H6>
				<Paragraph className="mb-12 mt-3">
					{`
Kent C. Dodds is a JavaScript software engineer and teacher. Kent's taught hundreds
of thousands of people how to make the world a better place with quality software
development tools and practices. He lives with his wife and four kids in Utah.
          `.trim()}
				</Paragraph>
				<ArrowLink to="/about">Learn more about Kent</ArrowLink>
			</div>
		</Grid>
	)
}

export default function MdxScreen() {
	const data = useLoaderData<typeof loader>()
	const { requestInfo } = useRootData()

	const { code, dateDisplay, frontmatter } = data.page
	const params = useParams()
	const { slug } = params
	const Component = useMdxComponent(code)

	const permalink = `${requestInfo.origin}/blog/${slug}`

	const readMarker = React.useRef<HTMLDivElement>(null)
	const isDraft = Boolean(data.page.frontmatter.draft)
	const isArchived = Boolean(data.page.frontmatter.archived)
	const categoriesAndKeywords = [
		...(data.page.frontmatter.categories ?? []),
		...(data.page.frontmatter.meta?.keywords ?? []),
	]
	useOnRead({
		parentElRef: readMarker,
		time: data.page.readTime?.time,
		onRead: React.useCallback(() => {
			if (isDraft) return
			if (slug) void markAsRead({ slug })
		}, [isDraft, slug]),
	})

	return (
		<div
			key={slug}
			className={
				data.leadingTeam
					? `set-color-team-current-${data.leadingTeam.toLowerCase()}`
					: ''
			}
		>
			<Grid className="mb-10 mt-24 lg:mb-24">
				<div className="col-span-full flex justify-between lg:col-span-8 lg:col-start-3">
					<BackLink to="/blog">Back to overview</BackLink>
					<TeamStats
						totalReads={data.totalReads}
						rankings={data.readRankings}
						direction="down"
						pull="right"
					/>
				</div>
			</Grid>

			<Grid as="header" className="mb-12">
				<div className="col-span-full lg:col-span-8 lg:col-start-3">
					{isDraft ? (
						<div className="prose prose-light mb-6 max-w-full dark:prose-dark">
							{React.createElement(
								'callout-warning',
								{},
								`This blog post is a draft. Please don't share it in its current state.`,
							)}
						</div>
					) : null}
					{isArchived ? (
						<div className="prose prose-light mb-6 max-w-full dark:prose-dark">
							{React.createElement(
								'callout-warning',
								{},
								`This blog post is archived. It's no longer maintained and may contain outdated information.`,
							)}
						</div>
					) : null}
					<H2>{frontmatter.title}</H2>
					<H6 as="p" variant="secondary" className="mt-2">
						{[dateDisplay, data.page.readTime?.text ?? 'quick read']
							.filter(Boolean)
							.join(' — ')}
					</H6>
				</div>
				{frontmatter.bannerCloudinaryId ? (
					<div className="col-span-full mt-10 lg:col-span-10 lg:col-start-2 lg:mt-16">
						<BlurrableImage
							key={frontmatter.bannerCloudinaryId}
							blurDataUrl={frontmatter.bannerBlurDataUrl}
							className="aspect-[3/4] md:aspect-[3/2]"
							img={
								<img
									key={frontmatter.bannerCloudinaryId}
									title={getBannerTitleProp(frontmatter)}
									{...getImgProps(
										getImageBuilder(
											frontmatter.bannerCloudinaryId,
											getBannerAltProp(frontmatter),
										),
										{
											className: 'rounded-lg object-cover object-center',
											widths: [280, 560, 840, 1100, 1650, 2500, 2100, 3100],
											sizes: [
												'(max-width:1023px) 80vw',
												'(min-width:1024px) and (max-width:1620px) 67vw',
												'1100px',
											],
											transformations: {
												background: 'rgb:e6e9ee',
											},
										},
									)}
								/>
							}
						/>
					</div>
				) : null}
			</Grid>

			<main ref={readMarker}>
				<Grid className="mb-24">
					<div className="col-span-full lg:col-start-3 lg:col-end-11">
						<div className="flex flex-wrap">
							{frontmatter.translations?.length ? (
								<>
									<ul className="col-span-full -mb-4 -mr-4 flex flex-wrap lg:col-span-10 lg:col-start-3">
										{frontmatter.translations.map(({ language, link }) => (
											<li key={`${language}:${link}`}>
												<a
													href={link}
													className="focus-ring bg-secondary text-primary relative mb-4 mr-4 block h-auto w-auto whitespace-nowrap rounded-full px-6 py-3"
												>
													{language}
												</a>
											</li>
										))}
									</ul>
									<a
										href={externalLinks.translationContributions}
										className="text-secondary underlined my-3 mb-6 ml-5 block text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none"
										target="_blank"
										rel="noreferrer noopener"
									>
										Add translation
									</a>
								</>
							) : (
								<>
									<span className="text-secondary text-lg italic">
										No translations available.
									</span>

									<a
										href={externalLinks.translationContributions}
										className="text-secondary underlined ml-5 block text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none"
										target="_blank"
										rel="noreferrer noopener"
									>
										Add translation
									</a>
								</>
							)}
						</div>
					</div>
				</Grid>

				<Grid className="prose prose-light mb-24 break-words dark:prose-dark">
					<Component />
				</Grid>
			</main>

			{categoriesAndKeywords.includes('react') ||
			categoriesAndKeywords.includes('testing') ? (
				<div className="mx-auto mb-24 flex max-w-lg flex-col items-center justify-center gap-8 md:max-w-none md:flex-row">
					{categoriesAndKeywords.includes('react') ? (
						<div className="w-full max-w-lg md:w-auto">
							<CourseCard
								title="Epic React"
								description="Get Really Good at React"
								imageBuilder={images.courseEpicReact}
								courseUrl="https://epicreact.dev"
							/>
						</div>
					) : null}
					{categoriesAndKeywords.includes('testing') ? (
						<div className="w-full max-w-lg md:w-auto">
							<CourseCard
								title="Testing JavaScript"
								description="Ship Apps with Confidence"
								imageBuilder={images.courseTestingJS}
								courseUrl="https://testingjavascript.com"
							/>
						</div>
					) : null}
				</div>
			) : null}

			<Grid className="mb-24">
				<div className="col-span-full flex justify-end lg:col-span-8 lg:col-start-3">
					<TeamStats
						totalReads={data.totalReads}
						rankings={data.readRankings}
						direction="up"
						pull="right"
					/>
				</div>
			</Grid>

			<ArticleFooter
				editLink={data.page.editLink}
				permalink={permalink}
				title={data.page.frontmatter.title}
				isDraft={isDraft}
			/>

			<Spacer size="base" />

			{data.workshops.length > 0 ? (
				<>
					<HeaderSection
						title="Want to learn more?"
						subTitle="Join Kent in a live workshop"
					/>
					<Spacer size="2xs" />

					<Grid>
						<div className="col-span-full">
							<Grid nested rowGap>
								{data.workshops.map((workshop, idx) => (
									<div
										key={idx}
										className={clsx('col-span-4', {
											'hidden lg:block': idx >= 2,
										})}
									>
										<WorkshopCard
											workshop={workshop}
											// @ts-expect-error need to figure out a better way to
											// handle the fact that this is a SerializeObject type...
											titoEvents={data.workshopEvents
												.filter(typedBoolean)
												.filter(
													(e) => e.metadata.workshopSlug === workshop.slug,
												)}
										/>
									</div>
								))}
							</Grid>
						</div>
					</Grid>

					<Spacer size="base" />
				</>
			) : null}

			<BlogSection
				articles={data.recommendations}
				title="If you found this article helpful."
				description="You will love these ones as well."
				showArrowButton={false}
			/>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				400: ({ error }) => <FourHundred error={error.statusText} />,
				404: ({ error }) => (
					<FourOhFour articles={error.data.recommendations} />
				),
			}}
		/>
	)
}
