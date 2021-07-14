import type {CWKEpisode} from 'types'
import {differenceInWeeks} from 'date-fns'

function getCWKEpisodePath({
  seasonNumber,
  episodeNumber,
  slug,
}: Pick<CWKEpisode, 'seasonNumber' | 'episodeNumber' | 'slug'>) {
  const pad = (num: number) => String(num).padStart(2, '0')
  return `/chats/${pad(seasonNumber)}/${pad(episodeNumber)}/${slug}`
}

function getFeaturedEpisode<EpisodeType>(
  episodes: Array<EpisodeType>,
): EpisodeType {
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
