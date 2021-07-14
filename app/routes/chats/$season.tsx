import * as React from 'react'
import {json, useRouteData, Link} from 'remix'
import type {HeadersFunction} from 'remix'
import type {CWKSeason, KCDLoader} from 'types'
import {orderBy} from 'lodash'
import {Grid} from '../../components/grid'
import {getSeasonListItems} from '../../utils/simplecast.server'
import {useChatsEpisodeUIState} from '../../utils/providers'
import {formatTime} from '../../utils/misc'
import {getCWKEpisodePath} from '../../utils/chats-with-kent'

type LoaderData = {
  season: CWKSeason
}

export const loader: KCDLoader<{season: string}> = async ({params}) => {
  const seasons = await getSeasonListItems()
  const seasonNumber = Number(params.season)
  const season = seasons.find(s => s.seasonNumber === seasonNumber)
  if (!season) {
    throw new Error(`oh no. season for ${seasonNumber}: ${params.season}`)
  }

  const data: LoaderData = {season}
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=600',
    },
  })
}

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export default function Screen() {
  const {season} = useRouteData<LoaderData>()
  const {sortOrder} = useChatsEpisodeUIState()
  const episodes = orderBy(season.episodes, 'episodeNumber', sortOrder)
  return episodes.map(episode => (
    <Link key={episode.slug} to={getCWKEpisodePath(episode)}>
      <Grid
        nested
        className="group relative py-10 border-b border-gray-200 dark:border-gray-600 lg:py-5"
      >
        <div className="bg-secondary absolute -inset-px group-hover:block hidden -mx-6 rounded-lg" />

        <img
          className="relative flex-none col-span-1 rounded-lg"
          src={episode.image}
          alt={episode.title}
        />
        <div className="text-primary relative flex flex-col col-span-3 md:col-span-7 lg:flex-row lg:col-span-11 lg:items-center lg:justify-between">
          <h4 className="mb-3 text-xl font-medium lg:mb-0">
            <span className="inline-block w-10 lg:text-lg">
              {`${episode.episodeNumber.toString().padStart(2, '0')}.`}
            </span>
            {episode.title}
          </h4>
          <div className="text-gray-400 text-lg font-medium">
            {formatTime(episode.duration)}
          </div>
        </div>
      </Grid>
    </Link>
  ))
}
