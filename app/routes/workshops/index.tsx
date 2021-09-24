import * as React from 'react'
import type {HeadersFunction, MetaFunction} from 'remix'
import {useSearchParams} from 'react-router-dom'
import {Grid} from '~/components/grid'
import {getSocialImageWithPreTitle, images} from '~/images'
import {H3, H6} from '~/components/typography'
import {Tag} from '~/components/tag'
import {Spacer} from '~/components/spacer'
import {CourseSection} from '~/components/sections/course-section'
import {WorkshopCard} from '~/components/workshop-card'
import {HeroSection} from '~/components/sections/hero-section'
import {useWorkshopsData} from '../workshops'
import {
  useUpdateQueryStringValueWithoutNavigation,
  listify,
  getUrl,
  getDisplayUrl,
} from '~/utils/misc'
import {RegistrationPanel} from '~/components/workshop-registration-panel'
import {getSocialMetas} from '~/utils/seo'
import type {LoaderData as RootLoaderData} from '../../root'

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  const data = parentsData['routes/workshops']

  const tagsSet = new Set<string>()
  for (const workshop of data.workshops) {
    for (const category of workshop.categories) {
      tagsSet.add(category)
    }
  }

  return {
    ...getSocialMetas({
      title: 'Workshops with Kent C. Dodds',
      description: `Get really good at making software with Kent C. Dodds' ${
        data.workshops.length
      } workshops on ${listify([...tagsSet])}`,
      keywords: Array.from(tagsSet).join(', '),
      url: getUrl(requestInfo),
      image: getSocialImageWithPreTitle({
        url: getDisplayUrl(requestInfo),
        featuredImage: 'kent/kent-workshopping-at-underbelly',
        preTitle: 'Check out these workshops',
        title: `Live and remote React, TypeScript, and Testing workshops with instructor Kent C. Dodds`,
      }),
    }),
  }
}

export const headers: HeadersFunction = ({parentHeaders}) => parentHeaders

function WorkshopsHome() {
  const data = useWorkshopsData()

  const tagsSet = new Set<string>()
  for (const workshop of data.workshops) {
    for (const category of workshop.categories) {
      tagsSet.add(category)
    }
  }

  // this bit is very similar to what's on the blogs page.
  // Next time we need to do work in here, let's make an abstraction for them
  const tags = Array.from(tagsSet)
  const [searchParams] = useSearchParams()

  const [queryValue, setQuery] = React.useState<string>(() => {
    return searchParams.get('q') ?? ''
  })
  const workshops = queryValue
    ? data.workshops.filter(workshop =>
        queryValue.split(' ').every(tag => workshop.categories.includes(tag)),
      )
    : data.workshops

  const visibleTags = queryValue
    ? new Set(
        workshops.flatMap(workshop => workshop.categories).filter(Boolean),
      )
    : new Set(tags)

  function toggleTag(tag: string) {
    setQuery(q => {
      // create a regexp so that we can replace multiple occurrences (`react node react`)
      const expression = new RegExp(tag, 'ig')

      const newQuery = expression.test(q)
        ? q.replace(expression, '')
        : `${q} ${tag}`

      // trim and remove subsequent spaces (`react   node ` => `react node`)
      return newQuery.replace(/\s+/g, ' ').trim()
    })
  }

  useUpdateQueryStringValueWithoutNavigation('q', queryValue)

  return (
    <>
      <HeroSection
        title="Check out these remote workshops."
        subtitle="See our upcoming events below."
        imageBuilder={images.teslaY}
        imageSize="large"
      />

      {data.workshopEvents.length ? (
        <Grid>
          <H3 className="col-span-full">Currently Schedule Workshops</H3>
          <div className="col-span-full mt-6">
            {data.workshopEvents.map((workshopEvent, index) => (
              <React.Fragment key={workshopEvent.date}>
                <RegistrationPanel workshopEvent={workshopEvent} />
                {index === data.workshopEvents.length - 1 ? null : (
                  <Spacer size="2xs" />
                )}
              </React.Fragment>
            ))}
          </div>
        </Grid>
      ) : null}

      <Spacer size="base" />

      <Grid className="mb-14">
        <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
          {tags.map(tag => (
            <Tag
              key={tag}
              tag={tag}
              selected={queryValue.includes(tag)}
              onClick={() => toggleTag(tag)}
              disabled={!visibleTags.has(tag) && !queryValue.includes(tag)}
            />
          ))}
        </div>
      </Grid>

      <Grid className="mb-64">
        <H6 as="h2" className="col-span-full mb-6">
          {queryValue
            ? workshops.length === 1
              ? `1 workshop found`
              : `${workshops.length} workshops found`
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
