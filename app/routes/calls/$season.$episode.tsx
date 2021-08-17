import * as React from 'react'
import {redirect} from 'remix'
import type {KCDHandle, KCDLoader} from 'types'
import {getEpisodes} from '../../utils/transistor.server'
import {
  getEpisodeFromParams,
  getEpisodePath,
  Params,
} from '../../utils/call-kent'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const loader: KCDLoader<Params> = async ({params, request}) => {
  const episodes = await getEpisodes({request})
  const episode = getEpisodeFromParams(episodes, params)

  if (!episode) {
    return redirect('/calls')
  }

  // the slug doesn't really matter.
  // The unique identifier is the season and episode numbers.
  // But we'll redirect to the correct slug to make the URL nice.
  return redirect(getEpisodePath(episode))
}

export default function Screen() {
  return <div>You should have been redirected... Weird</div>
}
