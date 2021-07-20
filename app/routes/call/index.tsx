import * as React from 'react'

import {json, Link, useRouteData} from 'remix'
import type {LoaderFunction} from 'remix'
import type {Await} from 'types'
import {getEpisodes} from '../../utils/call-kent.server'

type LoaderData = {
  episodes: Await<ReturnType<typeof getEpisodes>>
}

export const loader: LoaderFunction = async () => {
  const data: LoaderData = {episodes: await getEpisodes()}
  return json(data)
}

export default function CallHomeScreen() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <h1>Calls</h1>
      <Link to="./record">Record your own call</Link>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
