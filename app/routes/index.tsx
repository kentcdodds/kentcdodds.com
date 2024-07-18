import {
	json,
	type HeadersFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
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
} from '#app/utils/misc.tsx'
import { getUser } from '#app/utils/session.server.ts'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = {}
	const [
		user,
		posts,
		totalBlogReads,
		blogRankings,
		totalBlogReaders,
		blogRecommendations,
	] = await Promise.all([
		getUser(request),
		getBlogMdxListItems({ request, timings }),
		getTotalPostReads({ request, timings }),
		getBlogReadRankings({ request, timings }),
		getReaderCount({ request, timings }),
		getBlogRecommendations({ request, timings }),
	])

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
				'Cache-Control': 'private, max-age=3600',
				Vary: 'Cookie',
				'Server-Timing': getServerTimeHeader(timings),
			},
		},
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function IndexRoute() {
	const data = useLoaderData<typeof loader>()
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
