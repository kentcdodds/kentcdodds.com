import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { getEpisodes } from '#app/utils/transistor.server.ts'
import { getEpisodesBySeason } from '../calls.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
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
