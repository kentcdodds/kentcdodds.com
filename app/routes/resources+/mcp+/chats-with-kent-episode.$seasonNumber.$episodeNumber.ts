import { json } from '@remix-run/node'
import { getSeasons } from '#app/utils/simplecast.server.js'

export async function loader({
	params,
	request,
}: {
	params: { seasonNumber: string; episodeNumber: string }
	request: Request
}) {
	const seasonNumber = Number(params.seasonNumber)
	const episodeNumber = Number(params.episodeNumber)

	if (isNaN(seasonNumber) || isNaN(episodeNumber)) {
		throw new Response('Season and episode numbers must be valid numbers', {
			status: 400,
		})
	}

	const seasons = await getSeasons({ request })
	const season = seasons.find((s) => s.seasonNumber === seasonNumber)

	if (!season) {
		throw new Response(`Season ${seasonNumber} not found`, { status: 404 })
	}

	const episode = season.episodes.find((e) => e.episodeNumber === episodeNumber)

	if (!episode) {
		throw new Response(`Episode ${episodeNumber} not found`, { status: 404 })
	}

	return json({
		title: episode.title,
		description: episode.description,
		transcript: episode.transcriptHTML || null,
	})
}
