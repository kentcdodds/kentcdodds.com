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

async function createEpisode({
  audio,
  title,
  description,
}: {
  audio: Buffer
  title: string
  description: string
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

  const created = await fetchTransitor<CreatedJson>({
    endpoint: 'v1/episodes',
    method: 'POST',
    data: {
      episode: {
        show_id: podcastId,
        season: '1',
        audio_url,
        title,
        summary: description,
        description,
      },
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

type EpisodeJson = {
  data: {
    id: string
    type: 'episode'
    attributes: {
      title: string
      media_url: string
      share_url: string
    }
  }
}

function getEpisode(id: string) {
  return fetchTransitor<EpisodeJson>({
    endpoint: `/v1/episodes/${id}`,
  })
}

export {createEpisode, getEpisode}
