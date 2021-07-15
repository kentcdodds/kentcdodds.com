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
import {IntroductionSection} from '../components/sections/introduction-section'
import {ProblemSolutionSection} from '../components/sections/problem-solution-section'
import {Spacer} from '../components/spacer'
import {HeroSection} from '../components/sections/hero-section'
import {images} from '../images'
import {ButtonLink} from '../components/button'
import {ServerError} from '../components/errors'

type LoaderData = {
  blogRecommendations: Array<MdxListItem>
}

export const loader: LoaderFunction = async () => {
  const blogRecommendations = (await getBlogRecommendations()).slice(0, 3)

  const data: LoaderData = {blogRecommendations}
  return json(data)
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}

function IndexRoute() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <HeroSection
        title="Helping people make the world a better place through quality software."
        imageUrl={images.alexSnowboarding()}
        imageAlt={images.alexSnowboarding.alt}
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
