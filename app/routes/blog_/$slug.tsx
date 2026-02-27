import { clsx } from 'clsx'
import * as React from 'react'
import {
	data as json,
	type HeadersFunction,
	Link,
	redirect,
	useParams,
} from 'react-router'
import { serverOnly$ } from 'vite-env-only/macros'
import { ArrowLink, BackLink } from '#app/components/arrow-button.tsx'
import { BlurrableImage } from '#app/components/blurrable-image.tsx'
import { CourseCard } from '#app/components/course-card.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { FourHundred, FourOhFour } from '#app/components/errors.tsx'
import { Grid } from '#app/components/grid.tsx'
import { BlogSection } from '#app/components/sections/blog-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { TeamStats } from '#app/components/team-stats.tsx'
import { H2, H4, H6, Paragraph } from '#app/components/typography.tsx'
import { externalLinks } from '#app/external-links.tsx'
import { getImageBuilder, getImgProps, images } from '#app/images.tsx'
import { FavoriteToggle } from '#app/routes/resources/favorite.tsx'
import { type KCDHandle, type MdxListItem } from '#app/types.ts'
import {
	getBlogReadRankings,
	getBlogRecommendations,
	getTotalPostReads,
} from '#app/utils/blog.server.ts'
import { getRankingLeader } from '#app/utils/blog.ts'
import { getBlogMdxListItems, getMdxPage } from '#app/utils/mdx.server.ts'
import {
	getBannerAltProp,
	getBannerTitleProp,
	mdxPageMeta,
	useMdxComponent,
} from '#app/utils/mdx.tsx'
import {
	formatNumber,
	requireValidSlug,
	reuseUsefulLoaderHeaders,
} from '#app/utils/misc.ts'
import { type NotFoundMatch } from '#app/utils/not-found-matches.ts'
import { getNotFoundSuggestions } from '#app/utils/not-found-suggestions.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { teamEmoji, useTeam } from '#app/utils/team-provider.tsx'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import { markAsRead } from '../action/mark-as-read.tsx'
import { type Route } from './+types/$slug'

const handleId = 'blog-post'
export const handle: KCDHandle = {
	id: handleId,
	getSitemapEntries: serverOnly$(async (request: Request) => {
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
	possibleMatches?: Array<NotFoundMatch>
	possibleMatchesQuery?: string
}

export async function loader({ request, params }: Route.LoaderArgs) {
	requireValidSlug(params.slug)
	// Canonicalize MDX-looking slugs. Historically some content-fetching code
	// accepted `.mdx`/`.md` suffixes, but the canonical public URL does not.
	if (params.slug.endsWith('.mdx') || params.slug.endsWith('.md')) {
		const canonicalSlug = params.slug.replace(/\.(mdx|md)$/i, '')
		throw redirect(`/blog/${canonicalSlug}`, { status: 301 })
	}
	const timings = {}
	const page = await getMdxPage(
		{ contentDir: 'blog', slug: params.slug },
		{ request, timings },
	)

	if (!page) {
		// Avoid caching/creating per-slug stats entries for random 404 slugs. (issue #461)
		const pathname = new URL(request.url).pathname
		const [recommendations, suggestions] = await Promise.all([
			getBlogRecommendations({
				request,
				timings,
				limit: 3,
				keywords: [],
				exclude: [params.slug],
			}),
			getNotFoundSuggestions({ request, pathname, limit: 8 }),
		])
		const headers = {
			// Don't cache speculative 404 slugs for long.
			'Cache-Control': 'private, max-age=60',
			Vary: 'Cookie',
			'Server-Timing': getServerTimeHeader(timings),
		}
		const catchData: CatchData = { recommendations }
		if (suggestions) {
			catchData.possibleMatches = suggestions.matches
			catchData.possibleMatchesQuery = suggestions.query
		}
		throw json(catchData, { status: 404, headers })
	}

	const userPromise = getUser(request, { timings })
	const favoritePromise = userPromise.then((user) =>
		user
			? prisma.favorite.findUnique({
					where: {
						userId_contentType_contentId: {
							userId: user.id,
							contentType: 'blog-post',
							contentId: params.slug,
						},
					},
					select: { id: true },
				})
			: null,
	)

	const [recommendations, readRankings, totalReads, favorite] =
		await Promise.all([
			getBlogRecommendations({
				request,
				timings,
				limit: 3,
				keywords: [
					...(page.frontmatter.categories ?? []),
					...(page.frontmatter.meta?.keywords ?? []),
				],
				exclude: [params.slug],
			}),
			getBlogReadRankings({ request, slug: params.slug, timings }),
			getTotalPostReads({ request, slug: params.slug, timings }),
			favoritePromise,
		])

	const headers = {
		'Cache-Control': 'private, max-age=3600',
		Vary: 'Cookie',
		'Server-Timing': getServerTimeHeader(timings),
	}

	return json(
		{
			page,
			isFavorite: Boolean(favorite),
			recommendations,
			readRankings,
			totalReads: formatNumber(totalReads),
			leadingTeam: getRankingLeader(readRankings)?.team ?? null,
		},
		{ status: 200, headers },
	)
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

		let visibilityEl: HTMLDivElement | null = document.createElement('div')

		function removeVisibilityEl() {
			if (!visibilityEl) return
			visibilityEl.remove()
			visibilityEl = null
		}

		let scrolledTheMain = false
		const observer = new IntersectionObserver((entries) => {
			if (!visibilityEl) return
			const currentVisibilityEl = visibilityEl
			const isVisible = entries.some((entry) => {
				return (
					entry.target === currentVisibilityEl && entry.isIntersecting
				)
			})
			if (isVisible) {
				scrolledTheMain = true
				maybeMarkAsRead()
				observer.disconnect()
				removeVisibilityEl()
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
		parentEl.appendChild(visibilityEl)
		observer.observe(visibilityEl)
		startTimer()
		document.addEventListener('visibilitychange', handleVisibilityChange)

		function cleanup() {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			clearTimeout(timerId)
			observer.disconnect()
			removeVisibilityEl()
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
							'underlined text-black hover:text-black focus:text-black focus:outline-none dark:text-white dark:hover:text-white dark:focus:text-white',
							{ hidden: isDraft },
						)}
						target="_blank"
						rel="noreferrer noopener"
						href={`https://x.com/intent/tweet?${new URLSearchParams({
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
							'underlined text-black hover:text-black focus:text-black focus:outline-none dark:text-white dark:hover:text-white dark:focus:text-white',
							{ hidden: isDraft },
						)}
						target="_blank"
						rel="noreferrer noopener"
						href={`https://x.com/search?${new URLSearchParams({
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
						className="underlined text-black hover:text-black focus:text-black focus:outline-none dark:text-white dark:hover:text-white dark:focus:text-white"
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
				<Paragraph className="mt-3 mb-12">
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

function ArticleQuestionCard() {
	return (
		<Grid>
			<div className="col-span-full lg:col-span-8 lg:col-start-3">
				<div className="bg-secondary border-secondary flex flex-col gap-6 rounded-lg border px-8 py-10 md:flex-row md:items-center md:justify-between md:gap-10 md:px-12">
					<div className="flex flex-col gap-3">
						<H4>Have a question about this article?</H4>
						<Paragraph prose={false} className="max-w-2xl">
							Bring it to the Call Kent podcast. Ask on{' '}
							<Link to="/calls" className="text-primary font-medium">
								/calls
							</Link>{' '}
							and I may answer it on the podcast.
						</Paragraph>
					</div>
					<ArrowLink
						className="flex-shrink-0"
						to="/calls"
						direction="right"
						prefetch="intent"
					>
						Place a call
					</ArrowLink>
				</div>
			</div>
		</Grid>
	)
}

export default function MdxScreen({ loaderData: data }: Route.ComponentProps) {
	const { requestInfo } = useRootData()

	const { dateDisplay, frontmatter, remoteDocument } = data.page
	if (!remoteDocument) {
		throw new Error('Blog page is missing required mdx-remote document.')
	}
	const params = useParams()
	const { slug } = params
	const Component = useMdxComponent({ remoteDocument })

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
			<Grid className="mt-24 mb-10 lg:mb-24">
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
						<div className="prose prose-light dark:prose-dark mb-6 max-w-full">
							{React.createElement(
								'callout-warning',
								{},
								`This blog post is a draft. Please don't share it in its current state.`,
							)}
						</div>
					) : null}
					{isArchived ? (
						<div className="prose prose-light dark:prose-dark mb-6 max-w-full">
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
					{!isDraft && slug ? (
						<div className="mt-6 flex justify-end">
							<FavoriteToggle
								contentType="blog-post"
								contentId={slug}
								initialIsFavorite={data.isFavorite}
							/>
						</div>
					) : null}
				</div>
				{frontmatter.bannerImageId ? (
					<div className="col-span-full mt-10 lg:col-span-10 lg:col-start-2 lg:mt-16">
						<BlurrableImage
							key={frontmatter.bannerImageId}
							blurDataUrl={frontmatter.bannerBlurDataUrl}
							className="aspect-[3/4] md:aspect-[3/2]"
							img={
								<img
									key={frontmatter.bannerImageId}
									title={getBannerTitleProp(frontmatter)}
									{...getImgProps(
										getImageBuilder(
											frontmatter.bannerImageId,
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
									<ul className="col-span-full -mr-4 -mb-4 flex flex-wrap lg:col-span-10 lg:col-start-3">
										{frontmatter.translations.map(({ language, link }) => (
											<li key={`${language}:${link}`}>
												<a
													href={link}
													className="focus-ring bg-secondary text-primary relative mr-4 mb-4 block h-auto w-auto rounded-full px-6 py-3 whitespace-nowrap"
												>
													{language}
												</a>
											</li>
										))}
									</ul>
									<a
										href={externalLinks.translationContributions}
										className="text-secondary underlined hover:text-team-current focus:text-team-current my-3 mb-6 ml-5 block text-lg font-medium focus:outline-none"
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
										className="text-secondary underlined hover:text-team-current focus:text-team-current ml-5 block text-lg font-medium focus:outline-none"
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

				<Grid className="prose prose-light dark:prose-dark mb-24 break-words">
					<Component />
				</Grid>
			</main>

			{categoriesAndKeywords.includes('react') ||
			categoriesAndKeywords.includes('testing') ||
			categoriesAndKeywords.includes('remix') ||
			categoriesAndKeywords.includes('ai') ? (
				<div className="px-10vw mx-auto mb-24 flex max-w-lg flex-col items-center justify-center gap-8 md:max-w-none md:flex-row">
					{categoriesAndKeywords.includes('react') ? (
						<div className="@container w-full max-w-lg">
							<CourseCard
								title="Epic React"
								description="Get Really Good at React"
								label="React course"
								lightImageBuilder={images.courseEpicReact}
								darkImageBuilder={images.courseEpicReactDark}
								courseUrl="https://epicreact.dev"
							/>
						</div>
					) : null}
					{categoriesAndKeywords.includes('testing') ? (
						<div className="@container w-full max-w-lg">
							<CourseCard
								title="Testing JavaScript"
								description="Ship Apps with Confidence"
								label="Testing course"
								lightImageBuilder={images.courseTestingJS}
								darkImageBuilder={images.courseTestingJSDark}
								courseUrl="https://testingjavascript.com"
							/>
						</div>
					) : null}
					{categoriesAndKeywords.includes('remix') ? (
						<div className="@container w-full max-w-lg">
							<CourseCard
								title="Epic Web"
								description="Become a full stack web dev."
								label="Full stack course"
								lightImageBuilder={images.courseEpicWebLight}
								darkImageBuilder={images.courseEpicWebDark}
								courseUrl="https://www.epicweb.dev"
							/>
						</div>
					) : null}
					{categoriesAndKeywords.includes('ai') ||
					categoriesAndKeywords.includes('mcp') ? (
						<div className="@container w-full max-w-lg">
							<CourseCard
								title="Epic AI"
								description="Learn to build AI-powered applications."
								label="AI development course"
								lightImageBuilder={images.courseEpicAILight}
								darkImageBuilder={images.courseEpicAIDark}
								courseUrl="https://www.epicai.pro"
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

			{!isDraft && slug ? (
				<Grid className="mb-12">
					<div className="col-span-full flex justify-end lg:col-span-8 lg:col-start-3">
						<FavoriteToggle
							contentType="blog-post"
							contentId={slug}
							initialIsFavorite={data.isFavorite}
						/>
					</div>
				</Grid>
			) : null}

			<ArticleFooter
				editLink={data.page.editLink}
				permalink={permalink}
				title={data.page.frontmatter.title}
				isDraft={isDraft}
			/>

			<Spacer size="sm" />

			<ArticleQuestionCard />

			<Spacer size="sm" />

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
					<FourOhFour
						articles={error.data.recommendations}
						possibleMatches={error.data.possibleMatches}
						possibleMatchesQuery={error.data.possibleMatchesQuery}
					/>
				),
			}}
		/>
	)
}
