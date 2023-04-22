import * as YAML from 'yaml'
import type {CountableSlugify} from '@sindresorhus/slugify'
import type {Await} from '~/types'
import {formatDate, typedBoolean} from '~/utils/misc'
import {markdownToHtml, stripHtml} from '~/utils/markdown.server'
import {downloadFile} from '~/utils/github.server'
import {cache, cachified} from '~/utils/cache.server'
import type {Timings} from './timing.server'

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
  const descriptionHTML = rawTalk.description
    ? await markdownToHtml(rawTalk.description)
    : ''
  return {
    title: rawTalk.title ?? 'TBA',
    tag: allTags.find(tag => rawTalk.tags?.includes(tag)) ?? rawTalk.tags?.[0],
    tags: rawTalk.tags ?? [],
    slug: slugify(rawTalk.title ?? 'TBA'),
    resourceHTMLs: rawTalk.resources
      ? await Promise.all(rawTalk.resources.map(r => markdownToHtml(r)))
      : [],
    descriptionHTML,
    description: descriptionHTML ? await stripHtml(descriptionHTML) : '',
    deliveries: (rawTalk.deliveries
      ? await Promise.all(
          rawTalk.deliveries.map(async d => {
            return {
              eventHTML: d.event ? await markdownToHtml(d.event) : undefined,
              date: d.date,
              recording: d.recording,
              dateDisplay: d.date ? formatDate(d.date) : 'TBA',
            }
          }),
        )
      : []
    ).sort((a, b) => {
      return a.date && b.date ? (moreRecent(a.date, b.date) ? -1 : 1) : 0
    }),
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

async function getTalksAndTags({
  request,
  forceFresh,
  timings,
}: {
  request?: Request
  forceFresh?: boolean
  timings?: Timings
}) {
  const slugify = await getSlugify()
  slugify.reset()

  const key = 'content:data:talks.yml'
  const talks = await cachified({
    cache,
    request,
    timings,
    key,
    ttl: 1000 * 60 * 60 * 24 * 14,
    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
    forceFresh,
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

      return {talks: allTalks, tags: allTags}
    },
    checkValue: (value: unknown) =>
      Boolean(value) &&
      typeof value === 'object' &&
      Array.isArray((value as {talks: []}).talks) &&
      Array.isArray((value as {tags: []}).tags),
  })

  return talks
}

export {getTalksAndTags}
