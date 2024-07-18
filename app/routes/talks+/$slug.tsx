// this is a placeholder to make /routes/talks+/_talks catch nested paths

import { type SerializeFrom, type MetaFunction } from '@remix-run/node'
import { getSocialImageWithPreTitle } from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { getDisplayUrl, getUrl } from '#app/utils/misc.tsx'
import { getSocialMetas } from '#app/utils/seo.ts'
import { type loader as talkLoader } from './_talks.tsx'

export const meta: MetaFunction<
	{},
	{ root: RootLoaderType; 'routes/talks+/_talks': typeof talkLoader }
> = ({ matches, params }) => {
	const { talks = [] } =
		(matches.find((m) => m.id === 'routes/talks+/_talks')?.data as
			| SerializeFrom<typeof talkLoader>
			| undefined) ?? {}
	const { requestInfo } = matches.find((m) => m.id === 'root')
		?.data as SerializeFrom<RootLoaderType>

	const talk = params.slug ? talks.find((t) => t.slug === params.slug) : null
	const title = talk ? talk.title : '404: Talk not found'
	return getSocialMetas({
		title: talk ? `${title} by Kent C. Dodds` : title,
		description: talk ? talk.description : '404: Talk not found',
		url: getUrl(requestInfo),
		image: getSocialImageWithPreTitle({
			url: getDisplayUrl(requestInfo),
			featuredImage: 'kent/kent-speaking-all-things-open',
			title,
			preTitle: `Checkout this talk by Kent`,
		}),
	})
}

export default function TalksSlug() {
	return null
}
