import * as YAML from 'yaml'
import {markdownToHtmlUnwrapped} from './markdown.server'
import {downloadDirList, downloadFile} from './github.server'
import {typedBoolean} from './misc'
import type {Workshop} from '~/types'
import {cache, cachified} from './cache.server'
import type {Timings} from './timing.server'

type RawWorkshop = {
  title?: string
  description?: string
  meta?: Record<string, unknown>
  events?: Array<Omit<Workshop['events'][number], 'type'>>
  convertKitTag?: string
  categories?: Array<string>
  problemStatements?: Workshop['problemStatementHTMLs']
  keyTakeaways?: Workshop['keyTakeawayHTMLs']
  topics?: Array<string>
  prerequisite?: string
}

async function getWorkshops({
  request,
  forceFresh,
  timings,
}: {
  request?: Request
  forceFresh?: boolean
  timings?: Timings
}) {
  const key = 'content:workshops'
  return cachified({
    cache,
    request,
    timings,
    forceFresh,
    key,
    ttl: 1000 * 60 * 60 * 24 * 7,
    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
    getFreshValue: async () => {
      const dirList = await downloadDirList(`content/workshops`)
      const workshopFileList = dirList
        .filter(
          listing => listing.type === 'file' && listing.name.endsWith('.yml'),
        )
        .map(listing => listing.name.replace(/\.yml$/, ''))
      const workshops = await Promise.all(
        workshopFileList.map(slug => getWorkshop(slug)),
      )
      return workshops.filter(typedBoolean)
    },
    checkValue: (value: unknown) => Array.isArray(value),
  })
}

async function getWorkshop(slug: string): Promise<null | Workshop> {
  const {default: pProps} = await import('p-props')

  const rawWorkshopString = await downloadFile(
    `content/workshops/${slug}.yml`,
  ).catch(() => null)
  if (!rawWorkshopString) return null
  let rawWorkshop
  try {
    rawWorkshop = YAML.parse(rawWorkshopString) as RawWorkshop
  } catch (error: unknown) {
    console.error(`Error parsing YAML`, error, rawWorkshopString)
    return null
  }
  if (!rawWorkshop.title) {
    console.error('Workshop has no title', rawWorkshop)
    return null
  }
  const {
    title,
    convertKitTag,
    description = 'This workshop is... indescribeable',
    categories = [],
    events = [],
    topics,
    meta = {},
  } = rawWorkshop

  if (!convertKitTag) {
    throw new Error('All workshops must have a convertKitTag')
  }

  const [
    problemStatementHTMLs,
    keyTakeawayHTMLs,
    topicHTMLs,
    prerequisiteHTML,
  ] = await Promise.all([
    rawWorkshop.problemStatements
      ? pProps({
          part1: markdownToHtmlUnwrapped(rawWorkshop.problemStatements.part1),
          part2: markdownToHtmlUnwrapped(rawWorkshop.problemStatements.part2),
          part3: markdownToHtmlUnwrapped(rawWorkshop.problemStatements.part3),
          part4: markdownToHtmlUnwrapped(rawWorkshop.problemStatements.part4),
        })
      : {part1: '', part2: '', part3: '', part4: ''},
    Promise.all(
      rawWorkshop.keyTakeaways?.map(keyTakeaway =>
        pProps({
          title: markdownToHtmlUnwrapped(keyTakeaway.title),
          description: markdownToHtmlUnwrapped(keyTakeaway.description),
        }),
      ) ?? [],
    ),
    Promise.all(topics?.map(r => markdownToHtmlUnwrapped(r)) ?? []),
    rawWorkshop.prerequisite
      ? markdownToHtmlUnwrapped(rawWorkshop.prerequisite)
      : '',
  ])

  return {
    slug,
    title,
    events: events.map(e => ({type: 'manual', ...e})),
    meta,
    description,
    convertKitTag,
    categories,
    problemStatementHTMLs,
    keyTakeawayHTMLs,
    topicHTMLs,
    prerequisiteHTML,
  }
}

export {getWorkshops}
