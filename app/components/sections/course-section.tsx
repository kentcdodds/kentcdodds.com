import * as React from 'react'
import {H2} from '../title'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {CourseCard} from '../course-card'

function CourseSection() {
  return (
    <Grid>
      <div className="flex flex-col col-span-full mb-10 space-y-10 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-2 lg:space-y-0">
          <H2>Have a look at some of the courses.</H2>
          <H2 variant="secondary">Level up your development skills.</H2>
        </div>

        <ArrowButton direction="right">See the all courses</ArrowButton>
      </div>

      <div className="col-span-full lg:col-span-6">
        <CourseCard
          title="Epic React"
          description="The most comprehensive guide for pro’s."
          imageUrl="/placeholders/epic-react.png"
          courseUrl="/"
        />
      </div>

      <div className="col-span-full mt-12 lg:col-span-6 lg:mt-0">
        <CourseCard
          title="Testing Javascript"
          description="Learn smart, efficient testing methods."
          imageUrl="/placeholders/testing-javascript.png"
          courseUrl="/"
        />
      </div>
    </Grid>
  )
}

export {CourseSection}
