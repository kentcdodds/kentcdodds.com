import * as React from 'react'
import {useState} from 'react'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H6} from '../../components/typography'
import {Tag} from '../../components/tag'
import {CourseSection} from '../../components/sections/course-section'
import {WorkshopCard} from '../../components/workshop-card'
import {HeroSection} from '../../components/sections/hero-section'
import {useWorkshops} from '../../utils/providers'

export function meta() {
  return {
    title: 'Workshops with Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

function WorkshopsHome() {
  const data = useWorkshops()

  const tagsSet = new Set<string>()
  for (const workshop of data.workshops) {
    for (const category of workshop.categories) {
      tagsSet.add(category)
    }
  }

  const tags = Array.from(tagsSet)
  // TODO: save state in url, like the filters on the blog?
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const workshops = selectedCategory
    ? data.workshops.filter(x => x.categories.includes(selectedCategory))
    : data.workshops

  return (
    <>
      <HeroSection
        title="Check out these remote workshops."
        subtitle="See our upcoming events below."
        imageBuilder={images.teslaX}
        imageSize="large"
      />

      <Grid className="mb-14">
        <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
          {tags.map(tag => (
            <Tag
              key={tag}
              tag={tag}
              selected={selectedCategory === tag}
              onClick={() =>
                selectedCategory === tag
                  ? setSelectedCategory('')
                  : setSelectedCategory(tag)
              }
            />
          ))}
        </div>
      </Grid>

      <Grid className="mb-64">
        <H6 as="h2" className="col-span-full mb-6">
          {selectedCategory
            ? `${workshops.length} workshops found`
            : 'Showing all workshops'}
        </H6>

        <div className="col-span-full">
          <Grid nested rowGap>
            {workshops.map(workshop => (
              <div key={workshop.slug} className="col-span-full md:col-span-4">
                <WorkshopCard
                  workshop={workshop}
                  workshopEvent={data.workshopEvents.find(
                    e => e.metadata.workshopSlug === workshop.slug,
                  )}
                />
              </div>
            ))}
          </Grid>
        </div>
      </Grid>

      <CourseSection />
    </>
  )
}

export default WorkshopsHome
