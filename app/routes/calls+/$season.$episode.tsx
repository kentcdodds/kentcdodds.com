import {
	redirect,
	type HeadersFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { type KCDHandle } from '#app/types.ts'
import { getEpisodeFromParams, getEpisodePath } from '#app/utils/call-kent.ts'
import { reuseUsefulLoaderHeaders } from '#app/utils/misc.tsx'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'
import { getEpisodes } from '#app/utils/transistor.server.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const timings = {}
	const { season, episode: episodeParam } = params
	if (!season || !episodeParam) {
		throw new Error('params.season or params.episode is not defined')
	}
	const episodes = await getEpisodes({ request, timings })
	const episode = getEpisodeFromParams(episodes, {
		season,
		episode: episodeParam,
	})

	if (!episode) {
		return redirect('/calls')
	}

	// the slug doesn't really matter.
	// The unique identifier is the season and episode numbers.
	// But we'll redirect to the correct slug to make the URL nice.
	return redirect(getEpisodePath(episode), {
		headers: {
			'Server-Timing': getServerTimeHeader(timings),
		},
	})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function Screen() {
	return <div>You should have been redirected... Weird</div>
}
