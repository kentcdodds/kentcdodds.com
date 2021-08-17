type TransistorEpisodeData = {
  id: string
  type: 'episode'
  attributes: {
    number: number | null
    season: number
    title: string
    summary: string
    description: string
    keywords: string
    duration?: number
    status: 'published' | 'scheduled' | 'draft'
    image_url: string
    media_url: string
    share_url: string
    embed_html: string
    embed_html_dark: string
    published_at: string
    updated_at: string
    audio_processing: boolean
  }
}
type TransistorEpisodesJson = {data: Array<TransistorEpisodeData>}

type TransistorAuthorizedJson = {
  data: {
    attributes: {
      upload_url: string
      audio_url: string
      content_type: string
    }
  }
}

type TransistorCreatedJson = {
  data: TransistorEpisodeData
}

type TransistorPublishedJson = {
  data: {}
}

type TransistorCreateEpisodeData = {
  episode: {
    show_id: string
    season?: number
    number?: number
    audio_url?: string
    title?: string
    summary?: string
    description?: string
    status?: 'published' | 'scheduled' | 'draft'
    image_url?: string
    increment_number?: boolean
    /** comma separated list of keywords **/
    keywords?: string
    alternate_url?: string
  }
}

type TransistorUpdateEpisodeData = {
  id: string
  episode: Omit<TransistorCreateEpisodeData['episode'], 'show_id'>
}

type TransistorErrorResponse = {errors: Array<{title: string}>}

export {
  TransistorErrorResponse,
  TransistorCreateEpisodeData,
  TransistorUpdateEpisodeData,
  TransistorPublishedJson,
  TransistorCreatedJson,
  TransistorAuthorizedJson,
  TransistorEpisodeData,
  TransistorEpisodesJson,
}
