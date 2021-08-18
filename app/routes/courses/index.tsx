import * as React from 'react'
import {json, useLoaderData} from 'remix'
import type {KCDLoader} from 'types'
import {Grid} from '../../components/grid'
import {getImgProps, images} from '../../images'
import {H2, H3, H6, Paragraph} from '../../components/typography'
import {ArrowButton, ArrowLink} from '../../components/arrow-button'
import {CourseCard, CourseCardProps} from '../../components/course-card'
import {HeroSection} from '../../components/sections/hero-section'
import {TestimonialSection} from '../../components/sections/testimonial-section'
import {getTestimonials} from '../../utils/testimonials.server'
import type {Testimonial} from '../../utils/testimonials.server'
import {Spacer} from '../../components/spacer'

type LoaderData = {
  testimonials: Array<Testimonial>
}

export const loader: KCDLoader = async ({request}) => {
  const testimonials = await getTestimonials({
    request,
    categories: ['courses', 'teaching'],
  })

  const data: LoaderData = {testimonials}
  return json(data)
}

export function meta() {
  return {
    title: 'Courses by Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

function SmallCourseCard({
  title,
  description,
  imageBuilder,
  courseUrl,
}: CourseCardProps) {
  return (
    <div className="bg-secondary relative flex flex-col col-span-full items-start mt-12 px-8 py-12 rounded-lg lg:col-span-4 lg:mt-0 lg:px-12">
      <img
        className="flex-none w-auto h-32 object-contain"
        {...getImgProps(imageBuilder, {
          widths: [128, 256, 384],
          sizes: ['8rem'],
        })}
      />
      <div className="flex flex-none items-end mb-4 h-48">
        <H3>{title}</H3>
      </div>
      <Paragraph className="flex-auto mb-16 max-w-sm">{description}</Paragraph>

      <ArrowLink to={courseUrl} className="flex-none">
        Visit course
      </ArrowLink>
    </div>
  )
}

function CoursesHome() {
  const data = useLoaderData<LoaderData>()
  return (
    <>
      <HeroSection
        title="Increase your value as a developer."
        subtitle="Invest in yourself with a dev course."
        imageBuilder={images.onewheel}
      />

      <Grid as="main" className="mb-48">
        <div className="hidden col-span-full mb-12 lg:block lg:col-span-4 lg:mb-0">
          <H6 as="h2">Reasons to invest in your career.</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-4 lg:mb-20">
          <H6 as="h3" className="mb-4">
            Become a more confident developer
          </H6>
          <Paragraph className="mb-20">
            Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
            nunc, dictum quis condimentum in, impe rdiet at arcu. Donec et nunc
            vel mas sa fringilla fermentum. Donec in orn are est doler sit amet.
          </Paragraph>
          <H6 as="h3" className="mb-4">
            Earn more money as a developer
          </H6>
          <Paragraph>
            Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
            nunc, dictum quis condimentum in, imp erdiet at arcu.
          </Paragraph>
        </div>
        <div className="hidden col-span-2 col-start-11 items-start justify-end lg:flex">
          <ArrowButton direction="down" />
        </div>
      </Grid>

      <h2 className="sr-only">Courses</h2>

      <Grid className="gap-y-4">
        <div className="col-span-full lg:col-span-6">
          <CourseCard
            title="Epic React"
            description="The most comprehensive guide for pro's."
            imageBuilder={images.courseEpicReact}
            courseUrl="https://epicreact.dev"
          />
        </div>

        <div className="col-span-full mt-12 lg:col-span-6 lg:mt-0">
          <CourseCard
            title="Testing Javascript"
            description="Learn smart, efficient testing methods."
            imageBuilder={images.courseTestingJS}
            courseUrl="https://testing-library.com"
          />
        </div>

        <SmallCourseCard
          title="The Beginner's Guide to React"
          description="This course is for React newbies and anyone looking to build a solid foundation. It's designed to teach you everything you need to start building web applications in React right away."
          imageBuilder={images.courseTheBeginnersGuideToReact}
          courseUrl="https://egghead.io/courses/the-beginner-s-guide-to-react"
        />
        <SmallCourseCard
          title="Use Suspense to Simplify Your Async UI"
          description="In this course, I teach how Suspense works under the hood, preparing you for the future of asynchronous state management in React."
          imageBuilder={images.courseUseSuspenseToSimplifyYourAsyncUI}
          courseUrl="https://egghead.io/courses/use-suspense-to-simplify-your-async-ui"
        />
        <SmallCourseCard
          title="Simplify React Apps with React Hooks"
          description="In this course, I will take a modern React codebase that uses classes and refactor the entire thing to use function components as much as possible. We'll look at state, side effects, async code, caching, and more!"
          imageBuilder={images.courseSimplifyReactAppsWithReactHooks}
          courseUrl="https://egghead.io/courses/simplify-react-apps-with-react-hooks"
        />
        <SmallCourseCard
          title="Advanced React Component Patterns"
          description="Once you've nailed the fundamentals of React, that's when things get really fun. This course teaches you advanced patterns in React that you can use to make components that are simple, flexible, and enjoyable to work with."
          imageBuilder={images.courseAdvancedReactComponentPatterns}
          courseUrl="https://egghead.io/courses/advanced-react-component-patterns"
        />
        <SmallCourseCard
          title="JavaScript Testing Practices and Principles"
          description="Learn the principles and best practices for writing maintainable test applications to catch errors before your product reaches the end user!"
          imageBuilder={images.courseTestingPrinciples}
          courseUrl="https://frontendmasters.com/courses/testing-practices-principles/"
        />
        <SmallCourseCard
          title="Testing React Applications"
          description="Fix errors before your app reaches the end user by writing maintainable unit test & integration tests for your React applications!"
          imageBuilder={images.courseTestingReact}
          courseUrl="https://frontendmasters.com/courses/testing-react/"
        />
        <SmallCourseCard
          title="Code Transformation & Linting with ASTs"
          description="Learn to use Abstract Syntax Trees (ASTs) to make stylistic code changes, reveal logical problems, and prevent bugs from entering your codebase."
          imageBuilder={images.courseAsts}
          courseUrl="https://frontendmasters.com/courses/linting-asts/"
        />
        <SmallCourseCard
          title="How to Write an Open Source JavaScript Library"
          description="From Github and npm, to releasing beta versions, semantic versioning, code coverage, continuous integration, and providing your library with a solid set of unit tests, there are a ton of things to learn. This series will guide you through a set of steps to publish a JavaScript open source library."
          imageBuilder={images.courseHowToWriteAnOpenSourceJavaScriptLibrary}
          courseUrl="https://egghead.io/courses/how-to-write-an-open-source-javascript-library"
        />
        <SmallCourseCard
          title="How to Contribute to an Open Source Project on GitHub"
          imageBuilder={
            images.courseHowToContributeToAnOpenSourceProjectOnGitHub
          }
          courseUrl="https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github"
          description="“Feel free to submit a PR!” - words often found in GitHub issues, but met with confusion and fear by many. Getting started with contributing open source is not always straightforward and can be tricky. With this series, you'll be equipped with the the tools, knowledge, and understanding you need to be productive and contribute to the wonderful world of open source projects."
        />
      </Grid>

      <Spacer size="base" />

      <TestimonialSection testimonials={data.testimonials} />

      <Spacer size="base" />

      <Grid>
        <div className="col-span-full lg:col-span-5">
          <div className="col-span-full mb-12 px-10 lg:col-span-5 lg:col-start-1 lg:mb-0">
            <img
              className="object-contain"
              {...getImgProps(images.helmet, {
                widths: [420, 512, 840, 1260, 1024, 1680, 2520],
                sizes: [
                  '(max-width: 1023px) 80vw',
                  '(min-width: 1024px) and (max-width: 1620px) 40vw',
                  '630px',
                ],
              })}
            />
          </div>
        </div>

        <div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
          <H2 as="p" className="mb-8">
            Do you want to work trough one of these courses with peers?
          </H2>
          <H2 variant="secondary" as="p" className="mb-16">
            Check out our discord where we have learning clubs.
          </H2>
          <ArrowLink to="/discord">Learn more about the discord</ArrowLink>
        </div>
      </Grid>
    </>
  )
}

export default CoursesHome
