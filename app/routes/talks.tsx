import * as React from 'react'
import type {HeadersFunction, LoaderFunction, MetaFunction} from 'remix'
import {json, useLoaderData, Link, useLocation, useSearchParams} from 'remix'
import type {Await} from '~/types'
import formatDate from 'date-fns/format'
import clsx from 'clsx'
import {
  getUrl,
  getDisplayUrl,
  reuseUsefulLoaderHeaders,
  useUpdateQueryStringValueWithoutNavigation,
  listify,
} from '~/utils/misc'
import type {LoaderData as RootLoaderData} from '../root'
import {HeroSection} from '~/components/sections/hero-section'
import {getGenericSocialImage, images} from '~/images'
import {Tag} from '~/components/tag'
import {Grid} from '~/components/grid'
import {H3, H6, Paragraph} from '~/components/typography'
import {CourseSection} from '~/components/sections/course-section'
import {YoutubeIcon} from '~/components/icons/youtube-icon'
import {getTalksAndTags} from '~/utils/talks.server'
import {getSocialMetas} from '~/utils/seo'

export const meta: MetaFunction = ({data, parentsData}) => {
  const {talks = [], tags = []} = (data as LoaderData | undefined) ?? {}
  const {requestInfo} = parentsData.root as RootLoaderData
  const talkCount = talks.length
  const deliveryCount = talks.flatMap(t => t.deliveries).length
  const title = `${talkCount} talks by Kent all about software development`
  const topicsList = listify(tags.slice(0, 6))
  return {
    ...getSocialMetas({
      origin: requestInfo.origin,
      title,
      description: `Check out Kent's ${talkCount} talks he's delivered ${deliveryCount} times. Topics include: ${topicsList}`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        origin: requestInfo.origin,
        url: getDisplayUrl(requestInfo),
        featuredImage: images.teslaY.id,
        words: title,
      }),
    }),
  }
}

export type LoaderData = Await<ReturnType<typeof getTalksAndTags>>

export const loader: LoaderFunction = async ({request}) => {
  const talksAndTags: LoaderData = await getTalksAndTags({request})

  return json(talksAndTags, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      Vary: 'Cookie',
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

function Card({
  tag,
  tags,
  title,
  slug,
  deliveries,
  descriptionHTML,
  resourceHTMLs,
  active,
}: LoaderData['talks'][0] & {active: boolean}) {
  const latestDate = deliveries
    .filter(x => x.date)
    .map(x => new Date(x.date as string))
    .sort((l, r) => r.getTime() - l.getTime())[0] as Date

  const isInFuture = latestDate.getTime() > Date.now()

  return (
    <div
      className={clsx(
        'relative flex flex-col p-6 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg md:p-16',
        {
          'ring-2 focus-ring': active,
        },
      )}
    >
      {/* place the scroll marker a bit above the element to act as view margin */}
      <div data-talk={slug} className="absolute -top-8" />

      <div className="flex flex-none flex-col justify-between mb-8 md:flex-row">
        <div className="inline-flex items-baseline">
          {isInFuture ? (
            <div className="block flex-none w-3 h-3 bg-green-600 rounded-full" />
          ) : (
            <div className="block flex-none w-3 h-3 bg-gray-400 dark:bg-gray-600 rounded-full" />
          )}
          <H6 as="p" className="pl-4">
            {formatDate(latestDate, 'PPP')}
          </H6>
        </div>

        <div className="flex mt-8 space-x-2 md:mt-0">
          {tag ? (
            <div className="inline-block self-start -mr-8 -my-4 px-8 py-4 text-black dark:text-white whitespace-nowrap text-lg dark:bg-gray-600 bg-white rounded-full">
              {tag}
            </div>
          ) : null}
        </div>
      </div>

      <Link to={`./${slug}`} className="flex flex-none items-end mb-4 h-48">
        <H3 as="div">{title}</H3>
      </Link>

      <div className="flex-auto mb-10">
        <Paragraph
          as="div"
          className="html mb-20"
          dangerouslySetInnerHTML={{__html: descriptionHTML || '&nbsp;'}}
        />

        {tags.length ? (
          <>
            <H6 as="div" className="mb-2 mt-10">
              Keywords
            </H6>
            <Paragraph className="flex">{tags.join(', ')}</Paragraph>
          </>
        ) : null}

        {deliveries.length ? (
          <>
            <H6 as="div" className="mb-2 mt-10">
              Presentations
            </H6>
            <ul className="space-y-1">
              {deliveries.map(delivery => (
                <li key={`${delivery.recording}-${delivery.date}`}>
                  <div className="flex w-full">
                    <Paragraph
                      as="div"
                      className="html"
                      prose={false}
                      dangerouslySetInnerHTML={{
                        __html: delivery.eventHTML ?? '',
                      }}
                    />

                    {delivery.recording ? (
                      <a
                        className="text-secondary flex-none ml-2 hover:text-team-current"
                        href={delivery.recording}
                      >
                        <YoutubeIcon size={32} />
                      </a>
                    ) : null}

                    <div className="flex-auto" />
                    <Paragraph className="flex-none ml-2" as="span">
                      {delivery.date
                        ? formatDate(new Date(delivery.date), 'yyyy-MM-ii')
                        : null}
                    </Paragraph>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {resourceHTMLs.length ? (
          <>
            <H6 className="mb-2 mt-10" as="div">
              Resources
            </H6>
            <ul className="space-y-1">
              {resourceHTMLs.map(resource => (
                <li key={resource}>
                  <Paragraph
                    as="div"
                    className="html"
                    prose={false}
                    dangerouslySetInnerHTML={{__html: resource}}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function TalksScreen() {
  const data = useLoaderData<LoaderData>()
  const {pathname} = useLocation()
  const [activeSlug] = pathname.split('/').slice(-1)

  // An effect to scroll to the talk's position when opening a direct link,
  // use a ref so that it doesn't hijack scroll when the user is browsing talks
  React.useEffect(() => {
    document.querySelector(`[data-talk="${activeSlug}"]`)?.scrollIntoView()
  }, [activeSlug])

  // this bit is very similar to what's on the blogs page.
  // Next time we need to do work in here, let's make an abstraction for them
  const [searchParams] = useSearchParams()

  const [queryValue, setQuery] = React.useState<string>(() => {
    return searchParams.get('q') ?? ''
  })

  const talks = queryValue
    ? data.talks.filter(talk =>
        queryValue.split(',').every(tag => talk.tags.includes(tag)),
      )
    : data.talks

  const visibleTags = new Set(talks.flatMap(x => x.tags))

  function toggleTag(tag: string) {
    setQuery(q => {
      const existing = q
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)

      const newQuery = existing.includes(tag)
        ? existing.filter(t => t !== tag)
        : [...existing, tag]

      return newQuery.join(',')
    })
  }

  useUpdateQueryStringValueWithoutNavigation('q', queryValue)

  return (
    <>
      <HeroSection
        title="Check out these talks."
        subtitle="Mostly on location, sometimes remote."
        imageBuilder={images.teslaY}
        imageSize="large"
      />

      <Grid className="mb-14">
        <H6 as="div" className="col-span-full mb-6">
          Search talks by topics
        </H6>
        <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
          {data.tags.map(tag => (
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
            ? talks.length === 1
              ? `1 talk found`
              : `${talks.length} talks found`
            : 'Showing all talks'}
        </H6>

        <div className="col-span-full">
          <Grid nested rowGap>
            {talks.map(talk => {
              return (
                <div key={talk.slug} className="col-span-full lg:col-span-6">
                  <Card active={activeSlug === talk.slug} {...talk} />
                </div>
              )
            })}
          </Grid>
        </div>
      </Grid>

      <CourseSection />
    </>
  )
}
