import * as React from 'react'
import type {LoaderFunction} from 'remix'
import {useRouteData, json} from 'remix'
import type {MdxListItem} from 'types'
import {useState} from 'react'
import {
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
} from '../../utils/mdx'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H6} from '../../components/typography'
import {Tag} from '../../components/tag'
import {CourseSection} from '../../components/sections/course-section'
import {WorkshopCard} from '../../components/workshop-card'
import {HeroSection} from '../../components/sections/hero-section'

type LoaderData = {
  workshops: Array<MdxListItem>
}

export const loader: LoaderFunction = async () => {
  const pages = await getMdxPagesInDirectory('workshops')

  const data: LoaderData = {workshops: pages.map(mapFromMdxPageToMdxListItem)}
  return json(data)
}

export function meta() {
  return {
    title: 'Workshops with Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

const ALL_TECHS = ['javascript', 'react', 'testing']

function WorkshopsHome() {
  const data = useRouteData<LoaderData>()
  // TODO: save state in url, like the filters on the blog?
  const [selectedTech, setSelectedTech] = useState<string>('')
  const workshops = selectedTech
    ? data.workshops.filter(x => x.frontmatter.tech === selectedTech)
    : data.workshops

  return (
    <>
      <HeroSection
        title="Check out these remote workshops."
        subtitle="See our upcoming events below."
        imageUrl={images.teslaX()}
        imageAlt={images.teslaX.alt}
        imageSize="large"
      />

      <Grid className="mb-14">
        <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
          {ALL_TECHS.map(tech => (
            <Tag
              key={tech}
              tag={tech}
              selected={selectedTech === tech}
              onClick={() =>
                selectedTech === tech
                  ? setSelectedTech('')
                  : setSelectedTech(tech)
              }
            />
          ))}
        </div>
      </Grid>

      <Grid className="mb-64">
        <H6 className="col-span-full mb-6">
          {selectedTech
            ? `${workshops.length} workshops found`
            : 'Showing all workshops'}
        </H6>

        {workshops.map(workshop => (
          <div
            key={workshop.slug}
            className="col-span-full mb-4 md:col-span-4 lg:mb-6"
          >
            <WorkshopCard {...workshop} />
          </div>
        ))}
      </Grid>

      <CourseSection />
    </>
  )
}

export default WorkshopsHome
