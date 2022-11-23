import React from 'react'
import type {HeadersFunction, LoaderFunction} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import {getSeasons} from '~/utils/simplecast.server'
import {getServerTimeHeader} from '~/utils/timing.server'
import {reuseUsefulLoaderHeaders} from '~/utils/misc'

export const loader: LoaderFunction = async ({request, params}) => {
  const timings = {}
  const seasonNumber = Number(params.season)
  const episodeNumber = Number(params.episode)

  const seasons = await getSeasons({request, timings})
  const season = seasons.find(s => s.seasonNumber === seasonNumber)
  if (!season) {
    return redirect('/chats')
  }
  const episode = season.episodes.find(e => e.episodeNumber === episodeNumber)
  if (!episode) {
    return redirect('/chats')
  }

  // we don't actually need the slug, but we'll redirect them to the place
  // with the slug so the URL looks correct.
  return redirect(`/chats/${params.season}/${params.episode}/${episode.slug}`, {
    headers: {
      'Server-Timing': getServerTimeHeader(timings),
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function Screen() {
  return <div>Weird... You should have been redirected...</div>
}
