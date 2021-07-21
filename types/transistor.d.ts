type TransistorEpisodeData = {
  id: string
  type: 'episode'
  attributes: {
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
  data: {
    id: string
  }
}

type TransistorPublishedJson = {
  data: {}
}

type TransistorCreateEpisodeData = {
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

type TransistorErrorResponse = {errors: Array<{title: string}>}

export {
  TransistorErrorResponse,
  TransistorCreateEpisodeData,
  TransistorPublishedJson,
  TransistorCreatedJson,
  TransistorAuthorizedJson,
  TransistorEpisodeData,
  TransistorEpisodesJson,
}
