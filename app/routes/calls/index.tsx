import { redirect } from 'react-router'
import { getEpisodes } from '#app/utils/transistor.server.ts'
import { type Route } from './+types/index'
import { getEpisodesBySeason } from './_layout.tsx'

export async function loader({ request }: Route.LoaderArgs) {
	const episodes = await getEpisodes({ request })
	const seasons = getEpisodesBySeason(episodes)
	const seasonNumber = seasons[seasons.length - 1]?.seasonNumber ?? 1
	const season = seasons.find((s) => s.seasonNumber === seasonNumber)
	if (!season) {
		throw new Error(`oh no. season for ${seasonNumber}`)
	}

	return redirect(`/calls/${String(season.seasonNumber).padStart(2, '0')}`)
}

export default function CallsIndex() {
	return <div>Oops... You should not see this.</div>
}
