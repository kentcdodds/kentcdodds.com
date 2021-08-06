import * as React from 'react'
import {Outlet} from 'react-router'
import type {ActionFunction, LoaderFunction} from 'remix'
import {json, useLoaderData} from 'remix'
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
import {handleConvertKitFormSubmission} from '../convertkit/action.server'

type LoaderData = {
  blogRecommendations: Array<MdxListItem>
}

// this should go into `root.tsx`, but remix has a bug that should be fixed eventually.
// if you're reading this, try moving it over to root.tsx and see if that fixes it.
export const action: ActionFunction = async ({request}) => {
  return handleConvertKitFormSubmission(request)
}

export const loader: LoaderFunction = async ({request}) => {
  const blogRecommendations = await getBlogRecommendations(request)

  const data: LoaderData = {blogRecommendations}
  return json(data)
}

export default function IndexRoute() {
  const data = useLoaderData<LoaderData>()
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

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}
