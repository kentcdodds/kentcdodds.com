import * as React from 'react'
import {useParams} from 'react-router-dom'
import {redirect} from 'remix'
import type {KCDHandle, KCDLoader} from 'types'
import {useCallKentEpisodes} from '../../utils/providers'
import {getEpisodes} from '../../utils/transistor.server'
import {Themed} from '../../utils/theme-provider'
import {getEpisodeFromParams, Params} from '../../utils/call-kent'

export const handle: KCDHandle = {
  id: 'call-player',
  scroll: false,
  getSitemapEntries: async request => {
    const episodes = await getEpisodes({request})
    return episodes.map(episode => {
      const s = String(episode.seasonNumber).padStart(2, '0')
      const e = String(episode.episodeNumber).padStart(2, '0')
      return {
        route: `/calls/${s}/${e}/${episode.slug}`,
        changefreq: 'weekly',
        lastmod: new Date(episode.updatedAt).toISOString(),
        priority: 0.3,
      }
    })
  },
}

export const loader: KCDLoader<Params> = async ({params, request}) => {
  const episodes = await getEpisodes({request})
  const episode = getEpisodeFromParams(episodes, params)

  if (!episode) {
    return redirect('/calls')
  }

  // we already load all the episodes in the parent route so it would be
  // wasteful to send it here. The parent sticks all the episodes in context
  // so we just use it in the component.
  // This loader is only here for the 404 case we need to handle.
  return null
}

export default function Screen() {
  const params = useParams() as Params
  const episodes = useCallKentEpisodes()
  const episode = getEpisodeFromParams(episodes, params)

  if (!episode) {
    return <div>Oh no... No episode found with this slug: {params.slug}</div>
  }

  return (
    <Themed
      dark={
        <div
          dangerouslySetInnerHTML={{
            __html: episode.embedHtmlDark,
          }}
        />
      }
      light={
        <div
          dangerouslySetInnerHTML={{
            __html: episode.embedHtml,
          }}
        />
      }
    />
  )
}
