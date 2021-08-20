import * as React from 'react'
import type {LoaderFunction} from 'remix'
import {json, useLoaderData} from 'remix'
import * as YAML from 'yaml'
import type {CountableSlugify} from '@sindresorhus/slugify'
import type {Await} from '~/types'
import {useRef, useState} from 'react'
import formatDate from 'date-fns/format'
import {Link, useLocation} from 'react-router-dom'
import clsx from 'clsx'
import {typedBoolean} from '~/utils/misc'
import {markdownToHtml} from '~/utils/markdown.server'
import {downloadFile} from '~/utils/github.server'
import {cachified} from '~/utils/redis.server'
import {HeroSection} from '~/components/sections/hero-section'
import {images} from '~/images'
import {Tag} from '~/components/tag'
import {Grid} from '~/components/grid'
import {H3, H6, Paragraph} from '~/components/typography'
import {CourseSection} from '~/components/sections/course-section'
import {YoutubeIcon} from '~/components/icons/youtube-icon'

type RawTalk = {
  title?: string
  tag?: string
  tags?: Array<string>
  slug: string
  resources?: Array<string>
  description?: string
  deliveries?: Array<{event?: string; date?: string; recording?: string}>
}

type Talk = Await<ReturnType<typeof getTalk>>

let _slugify: CountableSlugify

async function getSlugify() {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!_slugify) {
    const {slugifyWithCounter} = await import('@sindresorhus/slugify')

    _slugify = slugifyWithCounter()
  }
  return _slugify
}

async function getTalk(rawTalk: RawTalk, allTags: Array<string>) {
  const slugify = await getSlugify()
  return {
    title: rawTalk.title ?? 'TBA',
    tag: allTags.find(tag => rawTalk.tags?.includes(tag)) ?? rawTalk.tags?.[0],
    tags: rawTalk.tags ?? [],
    slug: slugify(rawTalk.title ?? 'TBA'),
    resourceHTMLs: rawTalk.resources
      ? await Promise.all(rawTalk.resources.map(r => markdownToHtml(r)))
      : [],
    descriptionHTML: rawTalk.description
      ? await markdownToHtml(rawTalk.description)
      : undefined,
    deliveries: rawTalk.deliveries
      ? await Promise.all(
          rawTalk.deliveries.map(async d => {
            return {
              eventHTML: d.event ? await markdownToHtml(d.event) : undefined,
              date: d.date,
              recording: d.recording,
            }
          }),
        )
      : [],
  }
}

function sortByPresentationDate(a: Talk, b: Talk) {
  const mostRecentA = mostRecent(
    a.deliveries.map(({date}) => date).filter(typedBoolean),
  )
  const mostRecentB = mostRecent(
    b.deliveries.map(({date}) => date).filter(typedBoolean),
  )
  return moreRecent(mostRecentA, mostRecentB) ? -1 : 1
}

function mostRecent(dates: Array<string> = []) {
  return dates.reduce((recent: string, compare: string) => {
    if (!recent) return compare
    return moreRecent(compare, recent) ? compare : recent
  })
}

// returns true if a is more recent than b
function moreRecent(a: string | Date, b: string | Date) {
  if (typeof a === 'string') a = new Date(a)
  if (typeof b === 'string') b = new Date(b)
  return a > b
}

type LoaderData = {
  talks: Array<Talk>
  tags: Array<string>
}

function getTags(talks: Array<RawTalk>): string[] {
  // get most used tags
  const tagCounts: Record<string, number> = {}

  for (const talk of talks) {
    if (!talk.tags) continue

    for (const tag of talk.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }

  const tags = Object.entries(tagCounts)
    .filter(([_tag, counts]) => counts > 1) // only include tags assigned to >1 talks
    .sort((l, r) => r[1] - l[1]) // sort on num occurrences
    .map(([tag]) => tag) // extract tags, ditch the counts

  return tags
}

export const loader: LoaderFunction = async ({request}) => {
  const slugify = await getSlugify()
  slugify.reset()

  const data: LoaderData = await cachified({
    key: 'content:data:talks.yml',
    maxAge: 1000 * 60 * 60 * 24 * 14,
    request,
    getFreshValue: async () => {
      const talksString = await downloadFile('content/data/talks.yml')
      const rawTalks = YAML.parse(talksString) as Array<RawTalk>
      if (!Array.isArray(rawTalks)) {
        console.error('Talks is not an array', rawTalks)
        throw new Error('Talks is not an array.')
      }

      const allTags = getTags(rawTalks)

      const allTalks = await Promise.all(
        rawTalks.map(rawTalk => getTalk(rawTalk, allTags)),
      )
      allTalks.sort(sortByPresentationDate)
      allTags.sort()

      return {talks: allTalks, tags: allTags}
    },
    checkValue: (value: unknown) =>
      Boolean(value) &&
      typeof value === 'object' &&
      Array.isArray((value as LoaderData).talks) &&
      Array.isArray((value as LoaderData).tags),
  })

  return json(data)
}

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
        'relative flex flex-col p-16 pr-24 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg',
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
          <H6 as="p" className="pl-4 lowercase">
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
          dangerouslySetInnerHTML={{__html: descriptionHTML ?? '&nbsp;'}}
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
                      dangerouslySetInnerHTML={{
                        __html: delivery.eventHTML ?? '',
                      }}
                    />

                    {delivery.recording ? (
                      <a
                        className="text-secondary hover:text-primary flex-none ml-2"
                        href={delivery.recording}
                      >
                        <YoutubeIcon />
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
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const {pathname} = useLocation()
  const [activeSlug] = pathname.split('/').slice(-1)
  const initialActiveSlugRef = useRef(activeSlug)

  // An effect to scroll to the talk's position when opening a direct link,
  // use a ref so that it doesn't hijack scroll when the user is browsing talks
  React.useEffect(() => {
    const talk = initialActiveSlugRef.current
    if (talk) {
      document.querySelector(`[data-talk="${talk}"]`)?.scrollIntoView()
    }
  }, [initialActiveSlugRef])

  const toggleTag = (tag: string) => {
    const newSelection = selectedTags.includes(tag)
      ? selectedTags.filter(x => x !== tag)
      : [...selectedTags, tag]

    setSelectedTags(newSelection)
  }

  const talks = selectedTags.length
    ? data.talks.filter(talk =>
        selectedTags.every(tag => talk.tags.includes(tag)),
      )
    : data.talks

  const visibleTags = new Set(talks.flatMap(x => x.tags))

  return (
    <>
      <HeroSection
        title="Check out these talks."
        subtitle="Mostly on location, sometimes remote."
        imageBuilder={images.teslaX}
        imageSize="large"
      />

      <Grid className="mb-14">
        <H6 as="div" className="col-span-full mb-6">
          Search talks by topics
        </H6>
        <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
          {data.tags.map(tag => {
            const selected = selectedTags.includes(tag)

            return (
              <Tag
                key={tag}
                tag={tag}
                selected={selected}
                onClick={() => toggleTag(tag)}
                disabled={!visibleTags.has(tag) && !selected}
              />
            )
          })}
        </div>
      </Grid>

      <Grid className="mb-64">
        <H6 as="h2" className="col-span-full mb-6">
          {selectedTags.length
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
