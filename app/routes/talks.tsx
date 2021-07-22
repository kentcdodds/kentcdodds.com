import * as React from 'react'
import type {LoaderFunction} from 'remix'
import {json, useRouteData} from 'remix'
import * as YAML from 'yaml'
import type {Await} from 'types'
import {typedBoolean} from '../utils/misc'
import {markdownToHtml} from '../utils/markdown.server'
import {downloadFile} from '../utils/github.server'
import {cachified} from '../utils/redis.server'

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

  const data: LoaderData = {talks}
  return json(data)
}

export default function TalksScreen() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
