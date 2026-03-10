export const favoriteContentTypes = [
	'blog-post',
	'talk',
	'call-kent-episode',
	'chats-with-kent-episode',
	'youtube-video',
] as const

export type FavoriteContentType = (typeof favoriteContentTypes)[number]

export const favoriteIntents = ['add', 'remove'] as const
export type FavoriteIntent = (typeof favoriteIntents)[number]

/**
 * Canonical (string) identifier for season/episode based content.
 * Stored without leading zeroes so we have exactly one representation.
 */
export function getEpisodeFavoriteContentId({
	seasonNumber,
	episodeNumber,
}: {
	seasonNumber: number
	episodeNumber: number
}) {
	return `${String(seasonNumber)}:${String(episodeNumber)}`
}

export function parseEpisodeFavoriteContentId(contentId: string) {
	const [seasonRaw, episodeRaw, ...rest] = contentId.split(':')
	if (!seasonRaw || !episodeRaw || rest.length) return null
	const seasonNumber = Number(seasonRaw)
	const episodeNumber = Number(episodeRaw)
	if (!Number.isInteger(seasonNumber) || seasonNumber < 1) return null
	if (!Number.isInteger(episodeNumber) || episodeNumber < 1) return null
	if (String(seasonNumber) !== seasonRaw) return null
	if (String(episodeNumber) !== episodeRaw) return null
	return { seasonNumber, episodeNumber }
}
