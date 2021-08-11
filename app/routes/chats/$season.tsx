import * as React from 'react'
import {json, useLoaderData, Link} from 'remix'
import type {HeadersFunction} from 'remix'
import type {CWKSeason, KCDHandle, KCDLoader} from 'types'
import {orderBy} from 'lodash'
import {Grid} from '../../components/grid'
import {getSeasonListItems} from '../../utils/simplecast.server'
import {useChatsEpisodeUIState} from '../../utils/providers'
import {formatTime} from '../../utils/misc'
import {getCWKEpisodePath} from '../../utils/chats-with-kent'
import {TriangleIcon} from '../../components/icons/triangle-icon'

export const handle: KCDHandle = {
  getSitemapEntries: async request => {
    const seasons = await getSeasonListItems(request)
    return seasons.map(season => {
      return {
        route: `/chats/${season.seasonNumber.toString().padStart(2, '0')}`,
        priority: 0.4,
      }
    })
  },
}

type LoaderData = {
  season: CWKSeason
}

export const loader: KCDLoader<{season: string}> = async ({
  params,
  request,
}) => {
  const seasons = await getSeasonListItems(request)
  const seasonNumber = Number(params.season)
  const season = seasons.find(s => s.seasonNumber === seasonNumber)
  if (!season) {
    // TODO: add 404 here
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
  const {season} = useLoaderData<LoaderData>()
  const {sortOrder} = useChatsEpisodeUIState()
  const episodes = orderBy(season.episodes, 'episodeNumber', sortOrder)
  return episodes.map(episode => (
    <Link
      className="group focus:outline-none"
      key={episode.slug}
      to={getCWKEpisodePath(episode)}
    >
      <Grid
        nested
        className="relative py-10 border-b border-gray-200 dark:border-gray-600 lg:py-5"
      >
        <div className="bg-secondary absolute -inset-px group-focus:block group-hover:block hidden -mx-6 rounded-lg" />

        <div className="relative flex-none col-span-1">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-focus:opacity-100 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition">
            <div className="flex-none p-4 text-gray-800 bg-white rounded-full">
              <TriangleIcon size={12} />
            </div>
          </div>
          <img
            className="w-full rounded-lg object-cover"
            src={episode.image}
            alt={episode.title}
          />
        </div>
        <div className="text-primary relative flex flex-col col-span-3 md:col-span-7 lg:flex-row lg:col-span-11 lg:items-center lg:justify-between">
          <div className="mb-3 text-xl font-medium lg:mb-0">
            <span className="inline-block w-10 lg:text-lg">
              {`${episode.episodeNumber.toString().padStart(2, '0')}.`}
            </span>
            {episode.title}
          </div>
          <div className="text-gray-400 text-lg font-medium">
            {formatTime(episode.duration)}
          </div>
        </div>
      </Grid>
    </Link>
  ))
}
