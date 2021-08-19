import * as React from 'react'
import {Outlet} from 'react-router'
import type {LoaderFunction} from 'remix'
import {json, useLoaderData} from 'remix'
import type {MdxListItem, Team} from 'types'
import {
  getBlogReadRankings,
  getBlogRecommendations,
  getReaderCount,
} from '../utils/blog.server'
import {AboutSection} from '../components/sections/about-section'
import {BlogSection} from '../components/sections/blog-section'
import {CourseSection} from '../components/sections/course-section'
import {DiscordSection} from '../components/sections/discord-section'
import {IntroductionSection} from '../components/sections/introduction-section'
import {ProblemSolutionSection} from '../components/sections/problem-solution-section'
import {Spacer} from '../components/spacer'
import {HeroSection} from '../components/sections/hero-section'
import {images} from '../images'
import {ButtonLink} from '../components/button'
import {ServerError} from '../components/errors'
import {getBlogMdxListItems} from '../utils/mdx'
import {formatNumber} from '../utils/misc'

type LoaderData = {
  blogPostCount: string
  totalBlogReaders: string
  totalBlogReads: string
  currentBlogLeaderTeam: Team | undefined
  blogRecommendations: Array<MdxListItem>
}

export const loader: LoaderFunction = async ({request}) => {
  const posts = await getBlogMdxListItems({request})
  const blogRankings = await getBlogReadRankings()
  const totalBlogReaders = await getReaderCount()
  const blogRecommendations = await getBlogRecommendations(request)

  const totalBlogReads = blogRankings.reduce(
    (total, ranking) => ranking.totalReads + total,
    0,
  )

  const data: LoaderData = {
    blogRecommendations,
    blogPostCount: formatNumber(posts.length),
    totalBlogReaders:
      totalBlogReaders < 10_000
        ? 'tens of thousands'
        : formatNumber(totalBlogReaders),
    totalBlogReads:
      totalBlogReads < 100_000
        ? 'hundreds of thousands'
        : formatNumber(totalBlogReads),
    currentBlogLeaderTeam: blogRankings[0]?.team,
  }
  return json(data)
}

export default function IndexRoute() {
  const data = useLoaderData<LoaderData>()
  return (
    <div>
      <HeroSection
        title="Helping people make the world a better place through quality software."
        imageBuilder={images.alexSnowboarding}
        imageSize="giant"
        arrowUrl="#intro"
        arrowLabel="Learn more about Kent"
        action={
          <>
            <ButtonLink to="/blog" variant="primary">
              Read the blog
            </ButtonLink>
            <ButtonLink to="/courses" variant="secondary">
              Take a course
            </ButtonLink>
          </>
        }
      />

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
      <Outlet />
    </div>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}
