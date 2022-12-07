import {differenceInWeeks} from 'date-fns'

function getCWKEpisodePath({
  seasonNumber,
  episodeNumber,
  slug,
}: {
  seasonNumber: number
  episodeNumber: number
  slug?: string
}) {
  return [
    '/chats',
    seasonNumber.toString().padStart(2, '0'),
    episodeNumber.toString().padStart(2, '0'),
    slug,
  ]
    .filter(Boolean)
    .join('/')
}

function getFeaturedEpisode<EpisodeType>(
  episodes: Array<EpisodeType>,
): EpisodeType | null {
  if (!episodes.length) return null
  const weeksSinceMyBirthday = differenceInWeeks(
    new Date(),
    new Date('1988-10-18'),
  )
  const featured = episodes[weeksSinceMyBirthday % episodes.length]
  if (!featured) {
    throw new Error(
      `Could not find featured episode. This should be impossible. ${weeksSinceMyBirthday} % ${
        episodes.length
      } = ${weeksSinceMyBirthday % episodes.length}`,
    )
  }
  return featured
}

export {getCWKEpisodePath, getFeaturedEpisode}
