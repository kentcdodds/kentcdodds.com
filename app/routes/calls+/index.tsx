import { redirect, type LoaderFunction } from '@remix-run/node'
import { getEpisodesBySeason } from '../calls.tsx'
import { getEpisodes } from '~/utils/transistor.server.ts'

export const loader: LoaderFunction = async ({ request }) => {
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
