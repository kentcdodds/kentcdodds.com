import uuid from 'uuid'
import type {
  TransistorErrorResponse,
  TransistorCreateEpisodeData,
  TransistorPublishedJson,
  TransistorCreatedJson,
  TransistorAuthorizedJson,
  TransistorEpisodesJson,
  Request,
  CallKentEpisode,
  TransistorUpdateEpisodeData,
} from '~/types'
import {getRequiredServerEnvVar} from './misc'
import * as redis from './redis.server'
import {getEpisodePath} from './call-kent'

const transistorApiSecret = getRequiredServerEnvVar('TRANSISTOR_API_SECRET')
const podcastId = getRequiredServerEnvVar('CALL_KENT_PODCAST_ID', '67890')

async function fetchTransitor<JsonResponse>({
  endpoint,
  method = 'GET',
  query = {},
  data,
}: {
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, string>
  data?: Record<string, unknown>
}) {
  const url = new URL(endpoint, 'https://api.transistor.fm')
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }
  const config: RequestInit = {
    method,
    headers: {
      'x-api-key': transistorApiSecret,
    },
  }
  if (data) {
    config.body = JSON.stringify(data)
    Object.assign(config.headers, {'Content-Type': 'application/json'})
  }
  const res = await fetch(url.toString(), config)
  const json = await res.json()
  if (json.errors) {
    throw new Error(
      (json as TransistorErrorResponse).errors.map(e => e.title).join('\n'),
    )
  }
  return json as JsonResponse
}

async function createEpisode({
  audio,
  title,
  summary,
  description,
  keywords,
  imageUrl,
  domainUrl,
}: {
  audio: Buffer
  title: string
  summary: string
  description: string
  keywords: string
  imageUrl: string
  domainUrl: string
}) {
  const id = uuid.v4()
  const authorized = await fetchTransitor<TransistorAuthorizedJson>({
    endpoint: 'v1/episodes/authorize_upload',
    query: {filename: `${id}.mp3`},
  })
  const {upload_url, audio_url, content_type} = authorized.data.attributes

  await fetch(upload_url, {
    method: 'PUT',
    body: audio,
    headers: {'Content-Type': content_type},
  })

  const createData: TransistorCreateEpisodeData = {
    episode: {
      show_id: podcastId,
      season: 1,
      audio_url,
      title,
      summary,
      description,
      keywords,
      image_url: imageUrl,
      increment_number: true,
    },
  }

  const created = await fetchTransitor<TransistorCreatedJson>({
    endpoint: 'v1/episodes',
    method: 'POST',
    data: createData,
  })

  await fetchTransitor<TransistorPublishedJson>({
    endpoint: `/v1/episodes/${encodeURIComponent(created.data.id)}/publish`,
    method: 'PATCH',
    data: {
      episode: {
        status: 'published',
      },
    },
  })

  // set the alternate_url if we have enough info for it.
  const {number, season} = created.data.attributes
  if (typeof number === 'number' && typeof season === 'number') {
    const {default: slugify} = await import('@sindresorhus/slugify')
    const slug = slugify(created.data.attributes.title)
    const episodePath = getEpisodePath({
      episodeNumber: number,
      seasonNumber: season,
      slug,
    })

    const updateData: TransistorUpdateEpisodeData = {
      id: created.data.id,
      episode: {
        alternate_url: `${domainUrl}${episodePath}`,
      },
    }

    await fetchTransitor<TransistorPublishedJson>({
      endpoint: `/v1/episodes/${encodeURIComponent(created.data.id)}`,
      method: 'PATCH',
      data: updateData,
    })
  }

  // update the cache with the new episode
  await getCachedEpisodes({forceFresh: true})
}

async function getEpisodes() {
  const {default: slugify} = await import('@sindresorhus/slugify')
  const transistorEpisodes = await fetchTransitor<TransistorEpisodesJson>({
    endpoint: `/v1/episodes`,
  })
  // sort by episode number
  const sortedTransistorEpisodes = transistorEpisodes.data.sort((a, b) => {
    const aNumber = a.attributes.number ?? 0
    const bNumber = b.attributes.number ?? 0
    if (aNumber < bNumber) {
      return -1
    } else if (aNumber > bNumber) {
      return 1
    }
    return 0
  })
  const episodes: Array<CallKentEpisode> = []
  for (const episode of sortedTransistorEpisodes) {
    if (episode.attributes.audio_processing) continue
    if (episode.attributes.status !== 'published') continue
    if (!episode.attributes.number) continue
    if (!episode.attributes.duration) continue

    episodes.push({
      seasonNumber: episode.attributes.season,
      episodeNumber: episode.attributes.number,
      slug: slugify(episode.attributes.title),
      title: episode.attributes.title,
      summary: episode.attributes.summary,
      description: episode.attributes.description,
      keywords: episode.attributes.keywords,
      duration: episode.attributes.duration,
      shareUrl: episode.attributes.share_url,
      mediaUrl: episode.attributes.media_url,
      embedHtml: episode.attributes.embed_html,
      embedHtmlDark: episode.attributes.embed_html_dark,
      imageUrl: episode.attributes.image_url,
      publishedAt: episode.attributes.published_at,
      updatedAt: episode.attributes.updated_at,
    })
  }
  return episodes
}

const episodesCacheKey = `transistor:episodes:${podcastId}`

async function getCachedEpisodes({
  request,
  forceFresh,
}: {
  request?: Request
  forceFresh?: boolean
}) {
  return redis.cachified({
    key: episodesCacheKey,
    getFreshValue: getEpisodes,
    maxAge: 1000 * 60 * 60 * 24,
    forceFresh,
    request,
    checkValue: (value: unknown) =>
      Array.isArray(value) &&
      value.every(
        v => typeof v.slug === 'string' && typeof v.title === 'string',
      ),
  })
}

export {createEpisode, getCachedEpisodes as getEpisodes}
