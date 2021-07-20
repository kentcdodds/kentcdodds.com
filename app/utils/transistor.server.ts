import uuid from 'uuid'
import {getRequiredServerEnvVar} from './misc'

const transistorApiSecret = getRequiredServerEnvVar('TRANSISTOR_API_SECRET')
const podcastId = getRequiredServerEnvVar('CALL_KENT_PODCAST_ID', '67890')

type ErrorResponse = {errors: Array<{title: string}>}

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
    throw new Error((json as ErrorResponse).errors.map(e => e.title).join('\n'))
  }
  return json as JsonResponse
}

type AuthorizedJson = {
  data: {
    attributes: {
      upload_url: string
      audio_url: string
      content_type: string
    }
  }
}

type CreatedJson = {
  data: {
    id: string
  }
}

type PublishedJson = {
  data: {
    id: string
    type: 'episode'
    attributes: {
      status: 'published'
    }
    relationships: {}
  }
}

type CreateEpisodeData = {
  show_id: string
  season: string
  audio_url: string
  title: string
  summary: string
  description: string
  image_url: string
  /** comma separated list of keywords **/
  keywords: string
  // TODO: add alternate_url when we've got things listed on the site nicely
}

async function createEpisode({
  audio,
  title,
  summary,
  description,
  keywords,
  imageUrl,
}: {
  audio: Buffer
  title: string
  summary: string
  description: string
  keywords: string
  imageUrl: string
}) {
  const id = uuid.v4()
  const authorized = await fetchTransitor<AuthorizedJson>({
    endpoint: 'v1/episodes/authorize_upload',
    query: {filename: `${id}.mp3`},
  })
  const {upload_url, audio_url, content_type} = authorized.data.attributes

  await fetch(upload_url, {
    method: 'PUT',
    body: audio,
    headers: {'Content-Type': content_type},
  })

  const episode: CreateEpisodeData = {
    show_id: podcastId,
    season: '1',
    audio_url,
    title,
    summary,
    description,
    keywords,
    image_url: imageUrl,
  }

  const created = await fetchTransitor<CreatedJson>({
    endpoint: 'v1/episodes',
    method: 'POST',
    data: {
      episode,
    },
  })

  const published = await fetchTransitor<PublishedJson>({
    endpoint: `/v1/episodes/${encodeURIComponent(created.data.id)}/publish`,
    method: 'PATCH',
    data: {
      episode: {
        status: 'published',
      },
    },
  })
  return published
}

type EpisodeData = {
  id: string
  type: 'episode'
  attributes: {
    number: number
    title: string
    summary: string
    description: string
    keywords: string
    duration: number
    status: 'published' | 'scheduled' | 'draft'
    image_url: string
    media_url: string
    share_url: string
    embed_html: string
    embed_html_dark: string
    published_at: string
  }
}
type EpisodeJson = {
  data: EpisodeData
}

function getEpisode(id: string) {
  return fetchTransitor<EpisodeJson>({
    endpoint: `/v1/episodes/${id}`,
  })
}

function getEpisodes() {
  return fetchTransitor<{data: Array<EpisodeData>}>({
    endpoint: `/v1/episodes`,
  })
}

export {createEpisode, getEpisode, getEpisodes}
