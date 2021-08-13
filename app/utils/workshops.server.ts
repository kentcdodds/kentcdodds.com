import type {Request} from 'remix'
import * as YAML from 'yaml'
import type {Workshop, Testimonial} from 'types'
import {markdownToHtmlUnwrapped} from './markdown.server'
import type {Timings} from './metrics.server'
import {cachified} from './redis.server'
import {downloadDirList, downloadFile} from './github.server'
import {typedBoolean} from './misc'

type KeyTakeaway = {
  title: string
  description: string
}

type ProblemStatements = {
  part1: string
  part2: string
  part3: string
  part4: string
}

type RawWorkshop = {
  title?: string
  description?: string
  convertKitTag?: string
  categories?: Array<string>
  testimonials?: Array<Testimonial>
  problemStatements?: ProblemStatements
  keyTakeaways?: Array<KeyTakeaway>
  topics?: Array<string>
  prerequisite?: string
}

type Options = {request?: Request; timings?: Timings}

async function getWorkshops({request, timings}: Options) {
  const workshopFileList = await cachified({
    key: 'content:workshops:dirlist',
    request,
    timings,
    getFreshValue: async () => {
      const dirList = await downloadDirList(`content/workshops`)
      return dirList
        .filter(
          listing => listing.type === 'file' && listing.name.endsWith('.yml'),
        )
        .map(listing => listing.name.replace(/\.yml$/, ''))
    },
    checkValue: (value: unknown) => Array.isArray(value),
  })
  const workshops = await Promise.all(
    workshopFileList.map(slug => getWorkshop(slug, {request, timings})),
  )
  return workshops.filter(typedBoolean)
}

async function getWorkshop(slug: string, {request, timings}: Options) {
  const {default: pProps} = await import('p-props')

  const workshop = await cachified({
    key: `content:workshops:${slug}.yml`,
    request,
    timings,
    getFreshValue: async (): Promise<Workshop | null> => {
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
        testimonials = [],
        categories = [],
        topics,
      } = rawWorkshop

      const [
        problemStatementHTMLs,
        keyTakeawayHTMLs,
        topicHTMLs,
        prerequisiteHTML,
      ] = await Promise.all([
        rawWorkshop.problemStatements
          ? pProps({
              part1: markdownToHtmlUnwrapped(
                rawWorkshop.problemStatements.part1,
              ),
              part2: markdownToHtmlUnwrapped(
                rawWorkshop.problemStatements.part2,
              ),
              part3: markdownToHtmlUnwrapped(
                rawWorkshop.problemStatements.part3,
              ),
              part4: markdownToHtmlUnwrapped(
                rawWorkshop.problemStatements.part4,
              ),
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
        description,
        convertKitTag,
        categories,
        testimonials,
        problemStatementHTMLs,
        keyTakeawayHTMLs,
        topicHTMLs,
        prerequisiteHTML,
      }
    },
    checkValue: (value: unknown) =>
      typeof value === 'object' && value !== null && 'title' in value,
  })

  return workshop
}

export {getWorkshops, getWorkshop}
