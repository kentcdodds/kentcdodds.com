const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/

function isYouTubeVideoId(value: string | null | undefined): value is string {
	return typeof value === 'string' && youtubeVideoIdPattern.test(value)
}

function getYouTubeVideoId(value: string | null | undefined) {
	if (typeof value !== 'string') return null

	const trimmed = value.trim()
	if (!trimmed) return null
	if (isYouTubeVideoId(trimmed)) return trimmed

	try {
		const url = new URL(trimmed)
		const hostname = url.hostname.replace(/^www\./, '')

		if (hostname === 'youtu.be') {
			const [pathnameVideoId] = url.pathname.split('/').filter(Boolean)
			return isYouTubeVideoId(pathnameVideoId) ? pathnameVideoId : null
		}

		if (
			hostname !== 'youtube.com' &&
			hostname !== 'm.youtube.com' &&
			hostname !== 'music.youtube.com' &&
			hostname !== 'youtube-nocookie.com'
		) {
			return null
		}

		const searchVideoId = url.searchParams.get('v')
		if (isYouTubeVideoId(searchVideoId)) return searchVideoId

		const pathParts = url.pathname.split('/').filter(Boolean)
		const embeddedVideoId =
			pathParts[0] === 'embed' ||
			pathParts[0] === 'shorts' ||
			pathParts[0] === 'live'
				? pathParts[1]
				: null

		return isYouTubeVideoId(embeddedVideoId) ? embeddedVideoId : null
	} catch {
		return null
	}
}

function findFirstYouTubeVideoIdInText(text: string | null | undefined) {
	if (typeof text !== 'string') return null

	for (const match of text.matchAll(/https?:\/\/\S+/g)) {
		const candidate = match[0].replace(/[<>"')\],.;!?]+$/g, '')
		const youtubeVideoId = getYouTubeVideoId(candidate)
		if (youtubeVideoId) return youtubeVideoId
	}

	return null
}

export { findFirstYouTubeVideoIdInText, getYouTubeVideoId, isYouTubeVideoId }
