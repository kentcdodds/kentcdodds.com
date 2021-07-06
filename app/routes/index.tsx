import * as React from 'react'
import {Outlet} from 'react-router'
import type {LoaderFunction} from 'remix'
import {json, useRouteData} from 'remix'
import type {MdxListItem} from 'types'
import {getBlogRecommendations} from '../utils/blog.server'
import {AboutSection} from '../components/sections/about-section'
import {BlogSection} from '../components/sections/blog-section'
import {CourseSection} from '../components/sections/course-section'
import {DiscordSection} from '../components/sections/discord-section'
import {HeroSection} from '../components/sections/hero-section'
import {IntroductionSection} from '../components/sections/introduction-section'
import {ProblemSolutionSection} from '../components/sections/problem-solution-section'
import {Spacer} from '../components/spacer'

type LoaderData = {
  blogRecommendations: Array<MdxListItem>
}

export const loader: LoaderFunction = async ({request}) => {
  const blogRecommendations = (await getBlogRecommendations(request)).slice(
    0,
    3,
  )

  const data: LoaderData = {blogRecommendations}
  return json(data)
}

function IndexRoute() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <HeroSection />
      <Spacer size="large" />
      <IntroductionSection />
      <Spacer size="large" />
      <ProblemSolutionSection />
      <Spacer size="medium" />
      <BlogSection
        articles={data.blogRecommendations}
        title="Most popular from the blog."
        description="Probably the most helpful as well."
      />
      <Spacer size="large" />
      <CourseSection />
      <Spacer size="large" />
      <DiscordSection />
      <Spacer size="large" />
      <AboutSection />
      <Outlet />
    </div>
  )
}

export default IndexRoute
