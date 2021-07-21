import * as React from 'react'
import {json, Link, useRouteData} from 'remix'
import type {LoaderFunction} from 'remix'
import {Outlet} from 'react-router-dom'
import type {Await} from 'types'
import {getEpisodes} from '../utils/call-kent.server'
import {CallKentEpisodesProvider} from '../utils/providers'
import {getUser} from '../utils/session.server'
import {refreshEpisodes} from '../utils/transistor.server'

type LoaderData = {
  episodes: Await<ReturnType<typeof getEpisodes>>
}

export const loader: LoaderFunction = async ({request}) => {
  if (new URL(request.url).searchParams.has('fresh')) {
    const user = await getUser(request)
    if (user?.role === 'ADMIN') {
      await refreshEpisodes()
    }
  }

  const data: LoaderData = {episodes: await getEpisodes()}
  return json(data)
}

export default function CallHomeScreen() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <h2>Welcome to the Call Kent Podcast</h2>
      <Link to="./record">Record your own call</Link>
      <div className="flex">
        <div className="w-52 overscroll-auto">
          <ul>
            {data.episodes.map(episode => (
              <li key={episode.slug}>
                <Link to={`./${episode.slug}`}>{episode.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <CallKentEpisodesProvider value={data.episodes}>
          <Outlet />
        </CallKentEpisodesProvider>
      </div>
    </div>
  )
}
