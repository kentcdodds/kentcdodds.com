import { data as json, type HeadersFunction } from 'react-router'
import { ButtonLink } from '#app/components/button.tsx'
import { ServerError } from '#app/components/errors.tsx'
import { AboutSection } from '#app/components/sections/about-section.tsx'
import { BlogSection } from '#app/components/sections/blog-section.tsx'
import { CourseSection } from '#app/components/sections/course-section.tsx'
import { DiscordSection } from '#app/components/sections/discord-section.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { IntroductionSection } from '#app/components/sections/introduction-section.tsx'
import { ProblemSolutionSection } from '#app/components/sections/problem-solution-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { getRandomFlyingKody } from '#app/images.tsx'
import {
	getBlogReadRankings,
	getBlogRecommendations,
	getReaderCount,
	getTotalPostReads,
} from '#app/utils/blog.server.ts'
import { getRankingLeader } from '#app/utils/blog.ts'
import { getBlogMdxListItems } from '#app/utils/mdx.server.ts'
import {
	formatNumber,
	getOptionalTeam,
	reuseUsefulLoaderHeaders,
	teams,
	useCapturedRouteError,
} from '#app/utils/misc-react.tsx'
import { getUser } from '#app/utils/session.server.ts'
import {
	getServerTimeHeader,
	withTimeout,
	type Timings,
} from '#app/utils/timing.server.ts'
import { type Route } from './+types/index'

const HOMEPAGE_BLOG_CONTENT_TIMEOUT_MS = 3000
const HOMEPAGE_BLOG_STATS_TIMEOUT_MS = 1000

export async function loader({ request }: Route.LoaderArgs) {
	const timings: Timings = {}
	const userPromise = getUser(request)
	let loaderDataDegraded = false
	const withLoaderTimeout = <T,>(
		promise: Promise<T>,
		{
			timeoutMs,
			fallback,
			label,
		}: { timeoutMs: number; fallback: T; label: string },
	) =>
		withTimeout(
			promise.catch((error: unknown) => {
				loaderDataDegraded = true
				throw error
			}),
			{
				timeoutMs,
				fallback,
				label,
				onTimeout: () => {
					loaderDataDegraded = true
				},
			},
		)
	const postsPromise = withLoaderTimeout(
		getBlogMdxListItems({ request, timings }),
		{
			timeoutMs: HOMEPAGE_BLOG_CONTENT_TIMEOUT_MS,
			fallback: [],
			label: 'index:blog-mdx-list-items',
		},
	)
	const totalBlogReadsPromise = withLoaderTimeout(
		getTotalPostReads({ request, timings }),
		{
			timeoutMs: HOMEPAGE_BLOG_STATS_TIMEOUT_MS,
			fallback: 0,
			label: 'index:total-post-reads',
		},
	)
	const blogRankingsPromise = withLoaderTimeout(
		getBlogReadRankings({ request, timings }),
		{
			timeoutMs: HOMEPAGE_BLOG_STATS_TIMEOUT_MS,
			fallback: [],
			label: 'index:blog-read-rankings',
		},
	)
	const totalBlogReadersPromise = withLoaderTimeout(
		getReaderCount({ request, timings }),
		{
			timeoutMs: HOMEPAGE_BLOG_STATS_TIMEOUT_MS,
			fallback: 0,
			label: 'index:reader-count',
		},
	)
	const [posts, totalBlogReads, blogRankings, totalBlogReaders, user] =
		await Promise.all([
			postsPromise,
			totalBlogReadsPromise,
			blogRankingsPromise,
			totalBlogReadersPromise,
			userPromise,
		])
	if (posts.length === 0) {
		loaderDataDegraded = true
	}
	const blogRecommendations = posts.length
		? await withLoaderTimeout(getBlogRecommendations({ request, timings }), {
				timeoutMs: HOMEPAGE_BLOG_STATS_TIMEOUT_MS,
				fallback: [],
				label: 'index:blog-recommendations',
			})
		: []

	return json(
		{
			blogRecommendations,
			blogPostCount: formatNumber(posts.length),
			totalBlogReaders:
				totalBlogReaders < 10_000
					? 'hundreds of thousands of'
					: formatNumber(totalBlogReaders),
			totalBlogReads:
				totalBlogReads < 100_000
					? 'hundreds of thousands of'
					: formatNumber(totalBlogReads),
			currentBlogLeaderTeam: getRankingLeader(blogRankings)?.team,
			kodyTeam: getOptionalTeam(
				user?.team ?? teams[Math.floor(Math.random() * teams.length)],
			),
			randomImageNo: Math.random(),
		},
		{
			headers: {
				'Cache-Control': loaderDataDegraded
					? 'private, max-age=0, must-revalidate'
					: 'private, max-age=3600',
				Vary: 'Cookie',
				'Server-Timing': getServerTimeHeader(timings),
			},
		},
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function IndexRoute({ loaderData: data }: Route.ComponentProps) {
	const kodyFlying = getRandomFlyingKody(data.kodyTeam, data.randomImageNo)
	return (
		<div>
			<HeroSection
				title="Helping people make the world a better place through quality software."
				imageBuilder={kodyFlying}
				imageSize="giant"
				arrowUrl="#intro"
				arrowLabel="Learn more about Kent"
				action={
					<div className="mr-auto flex flex-col gap-4">
						<ButtonLink to="/blog" variant="primary" prefetch="intent">
							Read the blog
						</ButtonLink>
						<ButtonLink to="/courses" variant="secondary" prefetch="intent">
							Take a course
						</ButtonLink>
					</div>
				}
			/>

			<main>
				<IntroductionSection />
				<Spacer size="lg" />
				<ProblemSolutionSection
					blogPostCount={data.blogPostCount}
					totalBlogReads={data.totalBlogReads}
					currentBlogLeaderTeam={data.currentBlogLeaderTeam}
					totalBlogReaders={data.totalBlogReaders}
				/>
				<Spacer size="base" />
				<BlogSection
					articles={data.blogRecommendations}
					title="Blog recommendations"
					description="Prepared especially for you."
				/>
				<Spacer size="lg" />
				<CourseSection />
				<Spacer size="lg" />
				<DiscordSection />
				<Spacer size="lg" />
				<AboutSection />
			</main>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	console.error(error)
	return <ServerError />
}
