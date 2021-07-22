import * as React from 'react'
import type {LoaderFunction} from 'remix'
import {json, useRouteData} from 'remix'
import * as YAML from 'yaml'
import type {Await} from 'types'
import {useState} from 'react'
import formatDate from 'date-fns/format'
import {typedBoolean} from '../utils/misc'
import {markdownToHtml} from '../utils/markdown.server'
import {downloadFile} from '../utils/github.server'
import {cachified} from '../utils/redis.server'
import {HeroSection} from '../components/sections/hero-section'
import {images} from '../images'
import {Tag} from '../components/tag'
import {Grid} from '../components/grid'
import {H3, H6, Paragraph} from '../components/typography'
import {CourseSection} from '../components/sections/course-section'
import {YoutubeIcon} from '../components/icons/youtube-icon'

type RawTalk = {
  title?: string
  tags?: Array<string>
  resources?: Array<string>
  description?: string
  deliveries?: Array<{event?: string; date?: string; recording?: string}>
}

type Talk = Await<ReturnType<typeof getTalk>>

async function getTalk(rawTalk: RawTalk) {
  return {
    title: rawTalk.title,
    tags: rawTalk.tags ?? [],
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

export const loader: LoaderFunction = async ({request}) => {
  const talks = await cachified({
    key: 'content:data:talks.yml',
    request,
    getFreshValue: async () => {
      const talksString = await downloadFile('content/data/talks.yml')
      const rawTalks = YAML.parse(talksString) as Array<RawTalk>
      if (!Array.isArray(rawTalks)) {
        console.error('Talks is not an array', rawTalks)
        throw new Error('Talks is not an array.')
      }
      const allTalks = await Promise.all(rawTalks.map(getTalk))
      return allTalks.sort(sortByPresentationDate)
    },
    checkValue: (value: unknown) => Array.isArray(value),
  })

  const tags = Array.from(new Set(talks.flatMap(x => x.tags))).sort()

  const data: LoaderData = {talks, tags}
  return json(data)
}

function Card({
  tags,
  title,
  deliveries,
  descriptionHTML,
  resourceHTMLs,
}: LoaderData['talks'][0]) {
  const latestDate = deliveries
    .filter(x => x.date)
    .map(x => new Date(x.date as string))
    .sort((l, r) => r.getTime() - l.getTime())[0] as Date

  const isInFuture = latestDate.getTime() > Date.now()

  return (
    <div
      tabIndex={0}
      className="focus-ring block flex flex-col p-16 pr-24 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg"
    >
      <div className="flex flex-none justify-between mb-8">
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

        <div className="flex space-x-2">
          {tags.length ? (
            <div className="inline-block -mr-8 -mt-4 mb-4 px-8 py-4 text-black dark:text-white text-lg dark:bg-gray-600 bg-white rounded-full">
              {tags[0]}
            </div>
          ) : null}
        </div>
      </div>

      <H3 as="div" className="flex flex-none items-end mb-4 h-48">
        {title}
      </H3>

      <div className="flex-auto mb-10">
        <Paragraph
          as="div"
          className="mb-12"
          dangerouslySetInnerHTML={{__html: descriptionHTML ?? '&nbsp;'}}
        />

        <H6 as="div">Keywords</H6>
        <Paragraph className="flex mb-8">{tags.join(', ')}</Paragraph>

        <H6 as="div">Presentations</H6>
        <ul className="mb-8 space-y-2">
          {deliveries.map(delivery => (
            <li key={`${delivery.recording}-${delivery.date}`}>
              <div className="flex justify-between">
                <div className="inline-flex">
                  <Paragraph
                    as="div"
                    dangerouslySetInnerHTML={{
                      __html: delivery.eventHTML ?? '',
                    }}
                  />
                  {delivery.recording ? (
                    <a
                      className="text-secondary hover:text-primary ml-2"
                      href={delivery.recording}
                    >
                      <YoutubeIcon />
                    </a>
                  ) : null}
                </div>

                <Paragraph>
                  {delivery.date
                    ? formatDate(new Date(delivery.date), 'yyyy-MM-ii')
                    : null}
                </Paragraph>
              </div>
            </li>
          ))}
        </ul>

        <H6 as="div">Resources</H6>
        <ul className="space-y-2">
          {resourceHTMLs.map(resource => (
            <li key={resource}>
              <Paragraph
                as="div"
                dangerouslySetInnerHTML={{__html: resource}}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function TalksScreen() {
  const data = useRouteData<LoaderData>()
  const [selectedTech, setSelectedTech] = useState<string[]>([])

  const toggleTag = (tech: string) => {
    const newSelection = selectedTech.includes(tech)
      ? selectedTech.filter(x => x !== tech)
      : [...selectedTech, tech]

    setSelectedTech(newSelection)
  }

  const talks = selectedTech.length
    ? data.talks.filter(talk =>
        selectedTech.every(tag => talk.tags.includes(tag)),
      )
    : data.talks

  return (
    <>
      <HeroSection
        title="Check out these talks."
        subtitle="Mostly on location, sometimes remote."
        imageUrl={images.teslaX()}
        imageAlt={images.teslaX.alt}
        imageSize="large"
      />

      <Grid className="mb-14">
        <div className="flex flex-wrap col-span-full -mb-4 -mr-4 lg:col-span-10">
          {data.tags.map(tech => (
            <Tag
              key={tech}
              tag={tech}
              selected={selectedTech.includes(tech)}
              onClick={() => toggleTag(tech)}
            />
          ))}
        </div>
      </Grid>

      <Grid className="mb-64">
        <H6 as="h2" className="col-span-full mb-6">
          {selectedTech.length
            ? `${talks.length} talks found`
            : 'Showing all talks'}
        </H6>

        {/* TODO: talks don't have a unique prop */}
        {talks.map((talk, idx) => {
          return (
            <div
              key={`${idx}-${talk.title}`}
              data-idx={idx}
              className="md-col-span-4 col-span-full mb-4 lg:col-span-6 lg:mb-6"
            >
              <Card {...talk} />
            </div>
          )
        })}
      </Grid>

      <CourseSection />
    </>
  )
}
