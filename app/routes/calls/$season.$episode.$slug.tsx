import * as React from 'react'
import {useParams} from 'react-router-dom'
import {MetaFunction, redirect} from 'remix'
import type {LoaderData as RootLoaderData} from '../../root'
import type {KCDHandle, KCDLoader} from '~/types'
import {getEpisodes} from '~/utils/transistor.server'
import {Themed} from '~/utils/theme-provider'
import {getEpisodeFromParams, getEpisodePath, Params} from '~/utils/call-kent'
import {LoaderData as CallsLoaderData, useCallsData} from '../calls'
import {getSocialMetas} from '~/utils/seo'
import {getUrl} from '~/utils/misc'

export const handle: KCDHandle = {
  id: 'call-player',
  scroll: false,
  getSitemapEntries: async request => {
    const episodes = await getEpisodes({request})
    return episodes.map(episode => {
      return {
        route: getEpisodePath(episode),
        changefreq: 'weekly',
        lastmod: new Date(episode.updatedAt).toISOString(),
        priority: 0.3,
      }
    })
  },
}

export const meta: MetaFunction = ({parentsData, params}) => {
  const callsData = parentsData['routes/calls'] as CallsLoaderData | undefined
  const {requestInfo} = parentsData.root as RootLoaderData
  const metadata = {}
  if (!callsData) {
    console.error(
      `A call was unable to retrieve the parent's data by routes/calls`,
    )
    // the TS defs for MetaFunction are kinda weird...
    return Object.assign(metadata, {
      title: 'Call not found',
    })
  }
  const episode = getEpisodeFromParams(callsData.episodes, params as Params)
  if (!episode) {
    console.error(
      `A call was unable to retrieve the parent's data by routes/calls`,
    )
    // the TS defs for MetaFunction are kinda weird...
    return Object.assign(metadata, {
      title: 'Call not found',
    })
  }
  const title = `${episode.title} | Call Kent Podcast | ${episode.episodeNumber}`
  const playerUrl = episode.embedHtml.match(/src="(?<src>.+)"/)?.groups?.src
  return {
    ...getSocialMetas({
      title,
      description: episode.description,
      keywords: `call kent, kent c. dodds, ${episode.keywords}`,
      url: getUrl(requestInfo),
      image: episode.imageUrl,
    }),

    'twitter:card': 'player',
    'twitter:player': playerUrl ?? '',
    'twitter:player:width': '500',
    'twitter:player:height': '180',
    'twitter:player:stream': episode.mediaUrl,
    'twitter:player:stream:content_type': 'audio/mpeg',
  }
}

export const loader: KCDLoader<Params> = async ({params, request}) => {
  const episodes = await getEpisodes({request})
  const episode = getEpisodeFromParams(episodes, params)

  if (!episode) {
    return redirect('/calls')
  }

  // the slug doesn't really matter.
  // The unique identifier is the season and episode numbers.
  // But we'll redirect to the correct slug to make the URL nice.
  if (episode.slug !== params.slug) {
    return redirect(getEpisodePath(episode))
  }

  // we already load all the episodes in the parent route so it would be
  // wasteful to send it here. The parent sticks all the episodes in context
  // so we just use it in the component.
  // This loader is only here for the 404 case we need to handle.
  return null
}

export default function Screen() {
  const params = useParams() as Params
  const {episodes} = useCallsData()
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
