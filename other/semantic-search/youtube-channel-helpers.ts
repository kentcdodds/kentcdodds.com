export const KCD_OFFICE_HOURS_CHANNEL_URL =
	'https://www.youtube.com/c/kentcdodds-vids'

const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/
const OFFICE_HOURS_TITLE_PATTERN = /office hours/i

export function titleIncludesOfficeHours(title: string) {
	return OFFICE_HOURS_TITLE_PATTERN.test(title)
}

export function filterOfficeHoursVideos<T extends { title: string }>(videos: T[]) {
	return videos.filter((video) => titleIncludesOfficeHours(video.title))
}

export function extractYoutubeChannelIdFromHtml(html: string) {
	const patterns = [
		/"?externalId"?\s*:\s*"(?<channelId>UC[A-Za-z0-9_-]{22})"/,
		/"?channelId"?\s*:\s*"(?<channelId>UC[A-Za-z0-9_-]{22})"/,
		/"?browseId"?\s*:\s*"(?<channelId>UC[A-Za-z0-9_-]{22})"/,
	]

	for (const pattern of patterns) {
		const channelId = html.match(pattern)?.groups?.channelId
		if (channelId) return channelId
	}

	return null
}

export function getUploadsPlaylistIdFromChannelId(channelId: string) {
	if (!YOUTUBE_CHANNEL_ID_PATTERN.test(channelId)) return null
	return `UU${channelId.slice(2)}`
}
