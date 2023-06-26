import {images} from '~/images.tsx'
import {CourseCard} from '../course-card.tsx'
import {Grid} from '../grid.tsx'
import {HeaderSection} from './header-section.tsx'

function CourseSection() {
  return (
    <>
      <HeaderSection
        title="Are you ready to level up?"
        subTitle="Checkout some of my courses"
        cta="See all courses"
        ctaUrl="/courses"
        className="mb-16"
      />
      <Grid>
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
      </Grid>
    </>
  )
}

export {CourseSection}
