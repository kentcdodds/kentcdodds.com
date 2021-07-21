import * as React from 'react'
import type {LoaderFunction} from 'remix'
import {json, useRouteData} from 'remix'
import * as YAML from 'yaml'
import {downloadFile} from '../utils/github.server'
import {cachified} from '../utils/redis.server'

type Talks = Array<{
  title?: string
  resources?: Array<string>
  tags?: Array<string>
  description?: string
  deliveries?: Array<{event: string; date: string; recording: string}>
}>

type LoaderData = {
  talks: Talks
}

export const loader: LoaderFunction = async () => {
  const talksString = await cachified({
    key: 'talks.yml',
    getFreshValue: () => downloadFile('content/data/talks.yml'),
    checkValue: (value: unknown) => typeof value === 'string',
  })
  const talks = YAML.parse(talksString) as Talks
  if (!Array.isArray(talks)) {
    console.error('Talks is not an array', talks)
    throw new Error('Talks is not an array.')
  }
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
