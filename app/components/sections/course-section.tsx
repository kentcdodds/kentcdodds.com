import * as React from 'react'
import {H2} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {CourseCard} from '../course-card'

function CourseSection() {
  return (
    <Grid>
      <div className="flex flex-col col-span-full mb-10 space-y-10 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-2 lg:space-y-0">
          <H2>Have a look at some of the courses.</H2>
          <H2 variant="secondary" as="p">
            Level up your development skills.
          </H2>
        </div>

        <ArrowButton direction="right">See the all courses</ArrowButton>
      </div>

      <div className="col-span-full lg:col-span-6">
        {/* TODO: set correct imageUrl and courseUrl */}
        <CourseCard
          title="Epic React"
          description="The most comprehensive guide for pro’s."
          imageUrl="https://epicreact.dev/static/e9e50b43a9526373f48a11340fdfdbdc/6ba37/01-react-fundamentals.png"
          imageAlt="Epic React logo"
          courseUrl="/"
        />
      </div>

      <div className="col-span-full mt-12 lg:col-span-6 lg:mt-0">
        {/* TODO: set correct imageUrl and courseUrl */}
        <CourseCard
          title="Testing Javascript"
          description="Learn smart, efficient testing methods."
          imageUrl="https://testingjavascript.com/static/Pricing_Trophy_Gold-c7bda50071dab490179a098b4b6b4886.png"
          imageAlt="Testing Javascript logo"
          courseUrl="/"
        />
      </div>
    </Grid>
  )
}

export {CourseSection}
