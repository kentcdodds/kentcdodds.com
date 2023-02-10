import type {HeadersFunction, LoaderFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useLoaderData} from '@remix-run/react'
import type {MdxListItem, Team} from '~/types'
import {
  getBlogReadRankings,
  getBlogRecommendations,
  getReaderCount,
  getTotalPostReads,
} from '~/utils/blog.server'
import {AboutSection} from '~/components/sections/about-section'
import {BlogSection} from '~/components/sections/blog-section'
import {CourseSection} from '~/components/sections/course-section'
import {DiscordSection} from '~/components/sections/discord-section'
import {IntroductionSection} from '~/components/sections/introduction-section'
import {ProblemSolutionSection} from '~/components/sections/problem-solution-section'
import {Spacer} from '~/components/spacer'
import {HeroSection} from '~/components/sections/hero-section'
import {getRandomFlyingKody} from '~/images'
import {ButtonLink} from '~/components/button'
import {ServerError} from '~/components/errors'
import {getBlogMdxListItems} from '~/utils/mdx'
import type {OptionalTeam} from '~/utils/misc'
import {
  getOptionalTeam,
  formatNumber,
  reuseUsefulLoaderHeaders,
  teams,
} from '~/utils/misc'
import {getRankingLeader} from '~/utils/blog'
import {getUser} from '~/utils/session.server'
import {getServerTimeHeader} from '~/utils/timing.server'

type LoaderData = {
  blogPostCount: string
  totalBlogReaders: string
  totalBlogReads: string
  currentBlogLeaderTeam: Team | undefined
  blogRecommendations: Array<MdxListItem>
  kodyTeam: OptionalTeam
}

export const loader: LoaderFunction = async ({request}) => {
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
    getBlogMdxListItems({request, timings}),
    getTotalPostReads({request, timings}),
    getBlogReadRankings({request, timings}),
    getReaderCount({request, timings}),
    getBlogRecommendations({request, timings}),
  ])

  const data: LoaderData = {
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

export default function IndexRoute() {
  const data = useLoaderData<LoaderData>()
  const kodyFlying = getRandomFlyingKody(data.kodyTeam)
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

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}
