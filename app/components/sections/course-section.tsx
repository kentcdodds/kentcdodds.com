import * as React from 'react'
import {Grid} from '../grid'
import {images} from '../../images'
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
          <CourseCard
            title="Epic React"
            description="The most comprehensive guide for pro’s."
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
      </Grid>
    </>
  )
}

export {CourseSection}
