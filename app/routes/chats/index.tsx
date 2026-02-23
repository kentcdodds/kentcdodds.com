import { redirect } from 'react-router'
import { getSeasonListItems } from '#app/utils/simplecast.server.ts'
import { type Route } from './+types/index'

export async function loader({ request }: Route.LoaderArgs) {
	const seasons = await getSeasonListItems({ request })
	const seasonNumber = seasons[seasons.length - 1]?.seasonNumber ?? 1
	const season = seasons.find((s) => s.seasonNumber === seasonNumber)
	if (!season) {
		throw new Error(`oh no. season for ${seasonNumber}`)
	}

	return redirect(`/chats/${String(season.seasonNumber).padStart(2, '0')}`)
}

export default function ChatsIndex() {
	return <div>Oops... You should not see this.</div>
}
