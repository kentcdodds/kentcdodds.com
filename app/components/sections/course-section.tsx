import {images} from '~/images.tsx'
import {CourseCard} from '../course-card.tsx'
import {Grid} from '../grid.tsx'
import {HeaderSection} from './header-section.tsx'

function CourseSection() {
  return (
    <>
      <HeaderSection
        title="Prêts à opérer un changement ?"
        subTitle="Lance-toi sur mes formations !"
        cta="Voir les formations"
        ctaUrl="/courses"
        className="mb-16"
      />
      <Grid>
        <div className="col-span-full lg:col-span-6">
          <CourseCard
            title="Master Writer"
            description="Affranchis toi et captive ton audience."
            imageBuilder={images.courseEpicReact}
            courseUrl="ss"
          />
        </div>

        <div className="col-span-full mt-12 lg:col-span-6 lg:mt-0">
          <CourseCard
            title=" Project Expert"
            description="Gère tes projets efficamentet rapidement !"
            imageBuilder={images.courseTestingJS}
            courseUrl=""
          />
        </div>
      </Grid>
    </>
  )
}

export {CourseSection}
