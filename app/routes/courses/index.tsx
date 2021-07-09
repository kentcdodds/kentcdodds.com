import * as React from 'react'
import {json} from 'remix'

import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H2, H6, Paragraph} from '../../components/typography'
import type {KCDLoader} from '../../../types'
import {ArrowButton, ArrowLink} from '../../components/arrow-button'
import {CourseCard, SmallCourseCard} from '../../components/course-card'

export const loader: KCDLoader = async () => {
  return json({})
}

export function meta() {
  return {
    title: 'Courses by Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

const courseTitles = [
  `The Beginner's Guide to React`,
  `Use Suspense to Simplify Your Async UI`,
  `Simplify React Apps with React Hooks`,
  `Advanced React Component Patterns`,
  `JavaScript Testing Practices and Principles`,
  `Testing React Applications`,
  `Code Transformation & Linting with ASTs`,
  `How to Write an Open Source JavaScript Library`,
  `How to Contribute to an Open Source Project on GitHub`,
]

const courses = courseTitles.map((title, idx) => ({
  title,
  description: [
    'This course is for React newbies and anyone looking to build a solid foundation.',
    'preparing you for the future of asynchronous state management in React.',
  ][idx % 2] as string,
  imageUrl:
    'https://epicreact.dev/static/c55887c6ed1b7b57e1db4e4ae42f3eed/e4e36/05-react-performance.webp',
  imageAlt: title,
  courseUrl: `/${title.toLowerCase().replace(/ /g, '-')}`,
}))

function PodcastHome() {
  return (
    <div>
      <Grid className="grid-rows-max-content mb-24 mt-16 lg:mb-36">
        <div className="col-span-full mb-12 px-10 lg:col-span-5 lg:col-start-7 lg:mb-0">
          <img
            className="object-contain"
            src={images.onewheel()}
            alt={images.onewheel.alt}
          />
        </div>

        <div className="flex col-span-full items-center lg:col-span-6 lg:row-start-1">
          <div className="space-y-3 lg:max-w-sm lg:space-y-6">
            <H2>Increase your value as a developer.</H2>
            <H2 variant="secondary" as="p">
              Invest in yourself with a dev course.
            </H2>
          </div>
        </div>
      </Grid>

      <Grid as="main" className="mb-48">
        <div className="hidden col-span-full mb-12 lg:block lg:col-span-4 lg:mb-0">
          <H6>Reasons to invest in your career.</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-4 lg:mb-20">
          <H6 className="mb-4">Become a more confident developer</H6>
          <Paragraph className="mb-20">
            Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
            nunc, dictum quis condimentum in, impe rdiet at arcu. Donec et nunc
            vel mas sa fringilla fermentum. Donec in orn are est doler sit amet.
          </Paragraph>
          <H6 className="mb-4">Earn more money as a developer</H6>
          <Paragraph>
            Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
            nunc, dictum quis condimentum in, imp erdiet at arcu.
          </Paragraph>
        </div>
        <div className="hidden col-span-2 col-start-11 items-start justify-end lg:flex">
          <ArrowButton direction="down" />
        </div>
      </Grid>

      <Grid className="gap-y-4 mb-24 lg:mb-96">
        <div className="col-span-full lg:col-span-6">
          {/* TODO: set correct imageUrl */}
          <CourseCard
            title="Epic React"
            description="The most comprehensive guide for pro’s."
            imageUrl="https://epicreact.dev/static/e9e50b43a9526373f48a11340fdfdbdc/6ba37/01-react-fundamentals.png"
            imageAlt="Epic React logo"
            courseUrl="https://epicreact.dev"
          />
        </div>

        <div className="col-span-full mt-12 lg:col-span-6 lg:mt-0">
          {/* TODO: set correct imageUrl */}
          <CourseCard
            title="Testing Javascript"
            description="Learn smart, efficient testing methods."
            imageUrl="https://testingjavascript.com/static/Pricing_Trophy_Gold-c7bda50071dab490179a098b4b6b4886.png"
            imageAlt="Testing Javascript logo"
            courseUrl="https://testing-library.com"
          />
        </div>

        {/* TODO: replace fixtures */}
        {courses.map((course, idx) => (
          <div key={idx} className="col-span-full mt-12 lg:col-span-4 lg:mt-0">
            <SmallCourseCard {...course} />
          </div>
        ))}
      </Grid>

      <Grid>
        <div className="col-span-full lg:col-span-5">
          <div className="col-span-full mb-12 px-10 lg:col-span-5 lg:col-start-1 lg:mb-0">
            <img
              className="object-contain"
              src={images.helmet({
                resize: {type: 'crop', width: 2000, height: 2100},
              })}
              alt={images.helmet.alt}
            />
          </div>
        </div>

        <div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
          <H2 className="mb-8">
            Do you want to work trough one of these courses with peers?
          </H2>
          <H2 variant="secondary" as="p" className="mb-16">
            Check out our discord where we have learning clubs.
          </H2>
          <ArrowLink to="/discord">Learn more about the discord</ArrowLink>
        </div>
      </Grid>
    </div>
  )
}

export default PodcastHome
