import * as React from 'react'
import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {
  Link,
  useLoaderData,
  useLocation,
  useSearchParams,
} from '@remix-run/react'
import type {Await} from '~/types'
import clsx from 'clsx'
import {
  getUrl,
  getDisplayUrl,
  reuseUsefulLoaderHeaders,
  useUpdateQueryStringValueWithoutNavigation,
  listify,
  formatDate,
  parseDate,
} from '~/utils/misc'
import type {LoaderData as RootLoaderData} from '../root'
import {HeroSection} from '~/components/sections/hero-section'
import {getGenericSocialImage, images} from '~/images'
import {Tag} from '~/components/tag'
import {Grid} from '~/components/grid'
import {H3, H6, Paragraph} from '~/components/typography'
import {CourseSection} from '~/components/sections/course-section'
import {YoutubeIcon} from '~/components/icons'
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
      title,
      description: `Check out Kent's ${talkCount} talks he's delivered ${deliveryCount} times. Topics include: ${topicsList}`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
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
  const latestDelivery = deliveries
    .filter(x => x.date)
    .sort(
      (l, r) => parseDate(r.date!).getTime() - parseDate(l.date!).getTime(),
    )[0]

  const isInFuture = latestDelivery?.date
    ? parseDate(latestDelivery.date).getTime() > Date.now()
    : true

  return (
    <div
      className={clsx(
        'relative flex h-full w-full flex-col rounded-lg bg-gray-100 p-6 dark:bg-gray-800 md:p-16',
        {
          'focus-ring ring-2': active,
        },
      )}
    >
      {/* place the scroll marker a bit above the element to act as view margin */}
      <div data-talk={slug} className="absolute -top-8" />

      <div className="mb-8 flex flex-none flex-col justify-between md:flex-row">
        <div className="inline-flex items-baseline">
          {isInFuture ? (
            <div className="block h-3 w-3 flex-none rounded-full bg-green-600" />
          ) : (
            <div className="block h-3 w-3 flex-none rounded-full bg-gray-400 dark:bg-gray-600" />
          )}
          {latestDelivery ? (
            <H6 as="p" className="pl-4">
              {latestDelivery.dateDisplay}
            </H6>
          ) : null}
        </div>

        <div className="mt-8 flex space-x-2 md:mt-0">
          {tag ? (
            <div className="-my-4 -mr-8 inline-block self-start whitespace-nowrap rounded-full bg-white px-8 py-4 text-lg text-black dark:bg-gray-600 dark:text-white">
              {tag}
            </div>
          ) : null}
        </div>
      </div>

      <Link to={`./${slug}`} className="mb-4 flex h-48 flex-none items-end">
        <H3 as="div">{title}</H3>
      </Link>

      <div className="mb-10 flex-auto">
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
              {deliveries.map((delivery, index) => (
                <li key={index}>
                  <div className="flex w-full items-center gap-2">
                    {delivery.date &&
                    parseDate(delivery.date).getTime() > Date.now() ? (
                      <div className="block h-2 w-2 flex-none animate-pulse rounded-full bg-green-600" />
                    ) : null}
                    <Paragraph
                      as="div"
                      className="html"
                      prose={true}
                      dangerouslySetInnerHTML={{
                        __html: delivery.eventHTML ?? '',
                      }}
                    />

                    {delivery.recording ? (
                      <a
                        className="text-secondary ml-2 flex-none hover:text-team-current"
                        href={delivery.recording}
                      >
                        <YoutubeIcon size={32} />
                      </a>
                    ) : null}

                    <div className="flex-auto" />
                    <Paragraph
                      className="ml-2 flex-none tabular-nums"
                      as="span"
                    >
                      {delivery.date
                        ? formatDate(delivery.date, 'yyyy-MM-dd')
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
        subtitle={
          <>
            Mostly on{' '}
            <a href="https://kcd.im/map" className="underline">
              location
            </a>
            , sometimes remote.
          </>
        }
        imageBuilder={images.teslaY}
        imageSize="large"
      />

      <Grid className="mb-14">
        <H6 as="div" className="col-span-full mb-6">
          Search talks by topics
        </H6>
        <div className="col-span-full -mb-4 -mr-4 flex flex-wrap lg:col-span-10">
          {data.tags.map(tag => (
            <Tag
              key={tag}
              tag={tag}
              selected={queryValue.includes(tag)}
              onClick={() => toggleTag(tag)}
              disabled={Boolean(
                !visibleTags.has(tag) && !queryValue.includes(tag),
              )}
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
                  {/* @ts-expect-error need to figure this out later... */}
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
