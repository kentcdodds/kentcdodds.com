import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {useParams} from '@remix-run/react'
import type {LoaderData as RootLoaderData} from '../../root'
import type {KCDHandle} from '~/types'
import {getEpisodes} from '~/utils/transistor.server'
import {Themed} from '~/utils/theme-provider'
import type {Params} from '~/utils/call-kent'
import {getEpisodeFromParams, getEpisodePath} from '~/utils/call-kent'
import type {LoaderData as CallsLoaderData} from '../calls'
import {useCallsData} from '../calls'
import {getSocialMetas} from '~/utils/seo'
import {getUrl, reuseUsefulLoaderHeaders} from '~/utils/misc'
import {H6, Paragraph} from '~/components/typography'
import {IconLink} from '~/components/icon-link'
import {useRootData} from '~/utils/use-root-data'
import {TwitterIcon} from '~/components/icons'
import {getServerTimeHeader} from '~/utils/timing.server'

export const handle: KCDHandle = {
  id: 'call-player',
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

export const loader: LoaderFunction = async ({params, request}) => {
  const timings = {}
  const {season, episode: episodeParam, slug} = params
  if (!season || !episodeParam || !slug) {
    throw new Error(
      'params.season or params.episode or params.slug is not defined',
    )
  }
  const episodes = await getEpisodes({request, timings})
  const episode = getEpisodeFromParams(episodes, {
    season,
    episode: episodeParam,
    slug,
  })

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
  return json(
    {},
    {
      headers: {
        'Server-Timing': getServerTimeHeader(timings),
      },
    },
  )
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function Screen() {
  const params = useParams() as Params
  const {episodes} = useCallsData()
  const {requestInfo} = useRootData()
  const episode = getEpisodeFromParams(episodes, params)

  if (!episode) {
    return <div>Oh no... No episode found with this slug: {params.slug}</div>
  }
  const path = getEpisodePath(episode)

  const keywords = Array.from(
    new Set(
      episode.keywords
        .split(/[,;\s]/g) // split into words
        .map(x => x.trim()) // trim white spaces
        .filter(Boolean), // remove empties
    ), // omit duplicates
  ).slice(0, 3) // keep first 3 only

  return (
    <>
      <div className="flex justify-between gap-4">
        <div>
          <H6 as="div" className="flex-auto">
            Keywords
          </H6>
          <Paragraph className="mb-8 flex">{keywords.join(', ')}</Paragraph>
        </div>
        <IconLink
          target="_blank"
          rel="noreferrer noopener"
          href={`https://twitter.com/intent/tweet?${new URLSearchParams({
            url: `${requestInfo.origin}${path}`,
            text: `I just listened to "${episode.title}" on the Chats with Kent Podcast 🎙 by @kentcdodds`,
          })}`}
        >
          <TwitterIcon title="Tweet this" />
        </IconLink>
      </div>

      <H6 as="div">Description</H6>
      <Paragraph
        as="div"
        className="mb-8"
        dangerouslySetInnerHTML={{
          __html: episode.descriptionHTML,
        }}
      />
      <Themed
        // changing the theme while the player is going will cause it to
        // unload the player in the one theme and load it in the other
        // which is annoying.
        initialOnly={true}
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
    </>
  )
}
