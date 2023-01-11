import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useLoaderData} from '@remix-run/react'
import {Grid} from '~/components/grid'
import {getImgProps, getGenericSocialImage, images} from '~/images'
import {H2, H6, Paragraph} from '~/components/typography'
import {ArrowLink} from '~/components/arrow-button'
import {SmallCourseCard, CourseCard} from '~/components/course-card'
import {HeroSection} from '~/components/sections/hero-section'
import {TestimonialSection} from '~/components/sections/testimonial-section'
import {getTestimonials} from '~/utils/testimonials.server'
import type {Testimonial} from '~/utils/testimonials.server'
import {Spacer} from '~/components/spacer'
import {getDisplayUrl, getUrl, reuseUsefulLoaderHeaders} from '~/utils/misc'
import type {LoaderData as RootLoaderData} from '../root'
import {getSocialMetas} from '~/utils/seo'
import {getServerTimeHeader} from '~/utils/timing.server'

type LoaderData = {
  testimonials: Array<Testimonial>
}

export const loader: LoaderFunction = async ({request}) => {
  const timings = {}
  const testimonials = await getTestimonials({
    timings,
    request,
    categories: ['courses', 'teaching'],
  })

  const data: LoaderData = {testimonials}
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Server-Timing': getServerTimeHeader(timings),
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  return {
    ...getSocialMetas({
      title: 'Courses by Kent C. Dodds',
      description: 'Get really good at making software with Kent C. Dodds',
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        url: getDisplayUrl(requestInfo),
        featuredImage: images.onewheel.id,
        words: `Level up your skills with self-paced courses from Kent C. Dodds`,
      }),
    }),
  }
}

function CoursesHome() {
  const data = useLoaderData<LoaderData>()
  return (
    <>
      <HeroSection
        title="Level up as a developer."
        subtitle="Invest in yourself with a premium dev course."
        imageBuilder={images.onewheel}
      />

      <Grid as="main" className="mb-48">
        <div className="col-span-full mb-12 hidden lg:col-span-4 lg:mb-0 lg:block">
          <H6 as="h2">{`Reasons to invest in yourself`}</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-4 lg:mb-20">
          <H6 as="h3" className="mb-4">
            {`Become a more confident developer`}
          </H6>
          <Paragraph className="mb-20">
            {`
              All of us are familiar with the feeling of stumbling around
              between YouTube videos, blog posts, and documentation just
              copy/pasting code and hoping it'll work. It's frustrating and
              unproductive. With these courses, you'll have the confidence you
              need to skip all that stumbling and start shipping. Coding is
            `}
            <strong>more fun</strong>
            {` this way, trust me 🥳`}
          </Paragraph>
          <H6 as="h3" className="mb-4">
            {`Earn more money as a developer`}
          </H6>
          <Paragraph>
            {`
              The more skilled you are, the more you can get done and the more
              value you can provide to your employer and clients. If you don't
              think that comes with a bump in pay, ask the thousands of other
              devs who have experienced exactly this as a result of what they
              learned in these courses. Get that money 🤑
            `}
          </Paragraph>
        </div>
        <div className="col-span-2 col-start-11 hidden items-start justify-end lg:flex">
          <ArrowLink to="#courses" direction="down" />
        </div>
      </Grid>

      <h2 className="sr-only" id="courses">
        Courses
      </h2>

      <Grid className="gap-y-4">
        <div className="col-span-full lg:col-span-6">
          <CourseCard
            title="Epic React"
            description="The most comprehensive guide for pros."
            imageBuilder={images.courseEpicReact}
            courseUrl="https://epicreact.dev"
          />
        </div>

        <div className="col-span-full mt-12 lg:col-span-6 lg:mt-0">
          <CourseCard
            title="Testing JavaScript"
            description="Learn smart, efficient testing methods."
            imageBuilder={images.courseTestingJS}
            courseUrl="https://testingjavascript.com"
          />
        </div>

        <SmallCourseCard
          title="Advanced Remix"
          description="Remix is a terrific tool for building simple websites and even better for building complex web applications. Remix solves many problems in modern web development. You don't even think about server cache management or global CSS namespace clashes. It's not that Remix has APIs to avoid these problems; they simply don't exist when you're using Remix!"
          imageBuilder={images.courseFEMAdvancedRemix}
          courseUrl="https://frontendmasters.com/courses/advanced-remix/"
        />
        <SmallCourseCard
          title="Remix Fundamentals"
          description="Remix is a fullstack web framework that enables you to deliver a fast, slick, and resilient user experience. With Remix, you can build both static websites and dynamic web apps (requiring user data) while embracing the web platform's standard APIs along the way! Ready to build web apps faster?"
          imageBuilder={images.courseFEMRemixFundamentals}
          courseUrl="https://frontendmasters.com/courses/remix/"
        />
        <SmallCourseCard
          title="Up and Running with Remix"
          description="Jump in feet first and learn the most productive way to build a web application with the web framework that offers the best UX and DX the web has to offer."
          imageBuilder={images.courseUpAndRunningWithRemix}
          courseUrl="https://egghead.io/courses/up-and-running-with-remix-b82b6bb6?af=5236ad"
        />
        <SmallCourseCard
          title="The Beginner's Guide to React"
          description="This course is for React newbies and anyone looking to build a solid foundation. It's designed to teach you everything you need to start building web applications in React right away."
          imageBuilder={images.courseTheBeginnersGuideToReact}
          courseUrl="https://egghead.io/courses/the-beginner-s-guide-to-react?af=5236ad"
        />
        <SmallCourseCard
          title="Use Suspense to Simplify Your Async UI"
          description="In this course, I teach how Suspense works under the hood, preparing you for the future of asynchronous state management in React."
          imageBuilder={images.courseUseSuspenseToSimplifyYourAsyncUI}
          courseUrl="https://egghead.io/courses/use-suspense-to-simplify-your-async-ui?af=5236ad"
        />
        <SmallCourseCard
          title="Simplify React Apps with React Hooks"
          description="In this course, I will take a modern React codebase that uses classes and refactor the entire thing to use function components as much as possible. We'll look at state, side effects, async code, caching, and more!"
          imageBuilder={images.courseSimplifyReactAppsWithReactHooks}
          courseUrl="https://egghead.io/courses/simplify-react-apps-with-react-hooks?af=5236ad"
        />
        <SmallCourseCard
          title="Advanced React Component Patterns"
          description="Once you've nailed the fundamentals of React, that's when things get really fun. This course teaches you advanced patterns in React that you can use to make components that are simple, flexible, and enjoyable to work with."
          imageBuilder={images.courseAdvancedReactComponentPatterns}
          courseUrl="https://egghead.io/courses/advanced-react-component-patterns?af=5236ad"
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
          courseUrl="https://egghead.io/courses/how-to-write-an-open-source-javascript-library?af=5236ad"
        />
        <SmallCourseCard
          title="How to Contribute to an Open Source Project on GitHub"
          imageBuilder={
            images.courseHowToContributeToAnOpenSourceProjectOnGitHub
          }
          courseUrl="https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github?af=5236ad"
          description="“Feel free to submit a PR!” - words often found in GitHub issues, but met with confusion and fear by many. Getting started with contributing open source is not always straightforward and can be tricky. With this series, you'll be equipped with the the tools, knowledge, and understanding you need to be productive and contribute to the wonderful world of open source projects."
        />
      </Grid>

      {data.testimonials.length ? <Spacer size="base" /> : null}

      <TestimonialSection testimonials={data.testimonials} />

      <Spacer size="base" />

      <Grid>
        <div className="col-span-full lg:col-span-5">
          <div className="col-span-full mb-12 px-10 lg:col-span-5 lg:col-start-1 lg:mb-0">
            <img
              loading="lazy"
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
            {`Do you want to work through one of these courses with peers?`}
          </H2>
          <H2 variant="secondary" as="p" className="mb-16">
            {`Check out our discord where we have `}
            <Link className="underline" to="/clubs">
              learning clubs
            </Link>
            {`.`}
          </H2>
          <ArrowLink to="/discord">{`Learn more about the discord`}</ArrowLink>
        </div>
      </Grid>
    </>
  )
}

export default CoursesHome
