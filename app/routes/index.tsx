import {json, type HeadersFunction, type LoaderFunction} from '@remix-run/node'
import {useLoaderData, useRouteError} from '@remix-run/react'
import {ButtonLink} from '~/components/button'
import {ServerError} from '~/components/errors'
import {AboutSection} from '~/components/sections/about-section'
import {BlogSection} from '~/components/sections/blog-section'
import {CourseSection} from '~/components/sections/course-section'
import {DiscordSection} from '~/components/sections/discord-section'
import {HeroSection} from '~/components/sections/hero-section'
import {IntroductionSection} from '~/components/sections/introduction-section'
import {ProblemSolutionSection} from '~/components/sections/problem-solution-section'
import {Spacer} from '~/components/spacer'
import {getRandomFlyingKody} from '~/images'
import {type MdxListItem, type Team} from '~/types'
import {getRankingLeader} from '~/utils/blog'
import {
  getBlogReadRankings,
  getBlogRecommendations,
  getReaderCount,
  getTotalPostReads,
} from '~/utils/blog.server'
import {getBlogMdxListItems} from '~/utils/mdx'
import {
  formatNumber,
  getOptionalTeam,
  reuseUsefulLoaderHeaders,
  teams,
  type OptionalTeam,
} from '~/utils/misc'
import {getUser} from '~/utils/session.server'
import {getServerTimeHeader} from '~/utils/timing.server'

type LoaderData = {
  blogPostCount: string
  totalBlogReaders: string
  totalBlogReads: string
  currentBlogLeaderTeam: Team | undefined
  blogRecommendations: Array<MdxListItem>
  kodyTeam: OptionalTeam
  randomImageNo: number
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
    randomImageNo: Math.random(),
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
  const error = useRouteError()
  console.error(error)
  return <ServerError />
}
