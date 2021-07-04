import * as React from 'react'
import {useRouteData, Link, json} from 'remix'
import type {KCDLoader, MdxListItem} from 'types'
import {
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
} from '../../utils/mdx'
import {Grid} from '../../components/grid'
import {images} from '../../images'
import {H2, H3, H6, Paragraph} from '../../components/typography'
import {Tag} from '../../components/tag'
import {CourseSection} from '../../components/sections/course-section'
import {useState} from 'react'
import formatDate from 'date-fns/format'

type LoaderData = {
  workshops: Array<MdxListItem>
}

export const loader: KCDLoader = async ({request}) => {
  const pages = await getMdxPagesInDirectory(
    'workshops',
    new URL(request.url).searchParams.get('bust-cache') === 'true',
  )

  const data: LoaderData = {workshops: pages.map(mapFromMdxPageToMdxListItem)}
  return json(data)
}

export function meta() {
  return {
    title: 'Workshops with Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

function truncate(text: string, length: number) {
  if (!text || text.length <= length) {
    return text
  }

  return `${text.substr(0, length).trim()}…`
}

function WorkshopCard({
  slug,
  frontmatter: {
    date,
    title = 'Untitled Workshop',
    description = 'Description TBA',
    tech,
  },
}: MdxListItem) {
  return (
    <Link
      to={slug}
      className="focus-ring block flex flex-col p-16 pr-24 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg"
    >
      <div className="flex-none h-36">
        {/* TODO: how to determine if it's open or not? */}
        {Math.random() * 10 < 5 ? (
          <div className="inline-flex items-baseline">
            <div className="block flex-none w-3 h-3 bg-green-600 rounded-full" />
            <H6 as="p" className="pl-4">
              Open for registration
            </H6>
          </div>
        ) : null}
      </div>
      <div className="flex-none">
        <div className="inline-block mb-4 px-8 py-4 text-black dark:text-white text-lg dark:bg-gray-600 bg-white rounded-full">
          {tech}
        </div>
      </div>
      <H3 className="flex-none mb-3">{title}</H3>
      {/*TODO: line-clamp has a browser support of 90%, is that enough?*/}
      <div className="flex-auto mb-10">
        <Paragraph className="line-clamp-3">
          {/*
            We do use css line-clamp, this is for the 10% of the browsers that
            don't support that. Don't focus too much at perfection. It's important
            that the truncated string remains longer than the line-clamp, so that
            line-clamp precedes for the 90% supporting that.
          */}
          {truncate(description, 120)}
        </Paragraph>
      </div>
      {/*
        TODO: design shows different date format, but that wraps really quickly.
         I think we can move the time with timezone to the details page?
      */}
      <H6 className="flex flex-wrap">
        {date ? formatDate(new Date(date), 'PPP') : 'To be announced'}
      </H6>
    </Link>
  )
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
    <div>
      <Grid className="grid-rows-max-content mb-36 mt-16">
        <div className="col-span-full lg:col-span-6 lg:col-start-7 lg:row-span-2">
          <img
            className="object-cover"
            src={images.teslaX.src}
            alt={images.teslaX.alt}
          />
        </div>

        <div className="col-span-full lg:col-span-6 lg:row-start-1">
          <div className="space-y-2 lg:max-w-sm">
            <H2>Check out these remote workshops.</H2>
            <H2 variant="secondary" as="p">
              See our upcoming events below.
            </H2>
          </div>
        </div>
      </Grid>

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
    </div>
  )
}

export default WorkshopsHome
