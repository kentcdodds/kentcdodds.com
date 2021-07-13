type SimplecastCollectionResponse<CollectionType> = {
  collection: Array<CollectionType>
}
type SimpelcastSeasonListItem = {href: string; number: number}

type SimplecastEpisode = {
  is_hidden: boolean
  id: string
  duration: number
  number: number
  transcription: string
  status: 'draft' | 'published'
  is_published: boolean
  image_url: string
  audio_file_url: string
  slug: string
  description: string
  season: SimpelcastSeasonListItem
  long_description: string
  title: string
  keywords: SimplecastCollectionResponse<{value: string}>
}

type SimplecastEpisodeListItem = Pick<
  SimplecastEpisode,
  'status' | 'is_hidden' | 'id'
>

export {
  SimplecastCollectionResponse,
  SimpelcastSeasonListItem,
  SimplecastEpisode,
  SimplecastEpisodeListItem,
}
