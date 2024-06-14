// this is a placeholder to make /routes/talks+/_talks catch nested paths

import { type MetaFunction } from '@remix-run/node'
import {
	type loader as TalkLoader,
	type LoaderData as TalksLoaderData,
} from './_talks.tsx'
import { getSocialImageWithPreTitle } from '~/images.tsx'
import {
	type RootLoaderType,
	type LoaderData as RootLoaderData,
} from '~/root.tsx'
import { getDisplayUrl, getUrl } from '~/utils/misc.tsx'
import { getSocialMetas } from '~/utils/seo.ts'

export const meta: MetaFunction<
	{},
	{ root: RootLoaderType; 'routes/talks+/_talks': typeof TalkLoader }
> = ({ matches, params }) => {
	const { talks = [] } =
		(matches.find((m) => m.id === 'routes/talks+/_talks')?.data as
			| TalksLoaderData
			| undefined) ?? {}
	const { requestInfo } = matches.find((m) => m.id === 'root')
		?.data as RootLoaderData

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
