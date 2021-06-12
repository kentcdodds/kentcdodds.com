import uuid from 'uuid'

let transistorApiSecret = 'example_transistor_secret'
if (process.env.TRANSISTOR_API_SECRET) {
  transistorApiSecret = process.env.TRANSISTOR_API_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('TRANSISTOR_API_SECRET is required')
}

type ErrorResponse = {errors: Array<{title: string}>}

async function fetchTransitor<JsonResponse>({
  endpoint,
  method = 'GET',
  query,
}: {
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query: Record<string, string>
}) {
  const url = new URL(endpoint, 'https://api.transistor.fm')
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'x-api-key': transistorApiSecret,
    },
  })
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
    query: {
      'episode[show_id]': id,
      'episode[audio_url]': audio_url,
      'episode[title]': title,
      'episode[description]': description,
    },
  })
  console.log({created})

  const published = await fetchTransitor<PublishedJson>({
    endpoint: `/v1/episodes/${encodeURIComponent(created.data.id)}/publish`,
    method: 'PATCH',
    query: {
      'episode[status]': 'published',
    },
  })
  console.log({published})
  return published
}

export {createEpisode}
