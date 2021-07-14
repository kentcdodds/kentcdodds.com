import * as React from 'react'
import {Grid} from '../grid'
import {CourseCard} from '../course-card'
import {HeaderSection} from './header-section'

function CourseSection() {
  return (
    <>
      <HeaderSection
        title="Have a look at some of the courses"
        subTitle="Level up your development skills."
        cta="See all courses"
        ctaUrl="/courses"
        className="mb-16"
      />
      <Grid>
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
      </Grid>
    </>
  )
}

export {CourseSection}
