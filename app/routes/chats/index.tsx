import type {LoaderFunction} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import {getSeasonListItems} from '~/utils/simplecast.server'

export const loader: LoaderFunction = async ({request}) => {
  const seasons = await getSeasonListItems({request})
  const seasonNumber = seasons[seasons.length - 1]?.seasonNumber ?? 1
  const season = seasons.find(s => s.seasonNumber === seasonNumber)
  if (!season) {
    throw new Error(`oh no. season for ${seasonNumber}`)
  }

  return redirect(`/chats/${String(season.seasonNumber).padStart(2, '0')}`)
}

export default function ChatsIndex() {
  return <div>Oops... You should not see this.</div>
}
