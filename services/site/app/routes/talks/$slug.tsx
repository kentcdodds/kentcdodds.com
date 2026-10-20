// this is a placeholder to make /routes/talks/_layout catch nested paths

import { data as json, redirect, type MetaFunction } from 'react-router'
import { findTalkBySlug, getTalksAndTags } from '#app/utils/talks.server.ts'
import { type Route } from './+types/$slug'

export async function loader({ request, params }: Route.LoaderArgs) {
	const { talks } = await getTalksAndTags({ request })
	const talk = findTalkBySlug(talks, params.slug)
	if (talk && params.slug && talk.slug !== params.slug) {
		const url = new URL(request.url)
		return redirect(`/talks/${talk.slug}${url.search}`)
	}
	const title = talk ? talk.title : '404: Talk not found'
	const socialMetas = (
		await import('#app/og/page-meta.server.ts')
	).buildPageSocialMetasForRequest(request, {
		title: talk ? `${title} by Kent C. Dodds` : title,
		description: talk ? talk.description : '404: Talk not found',
		socialImage: talk
			? {
					kind: 'social-preview',
					preTitle: 'Checkout this talk by Kent',
					title,
					featuredImage: 'kent/kent-speaking-all-things-open',
				}
			: undefined,
	})

	return json({ socialMetas })
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (
		data != null &&
		typeof data === 'object' &&
		'socialMetas' in data &&
		Array.isArray(data.socialMetas)
	) {
		return data.socialMetas
	}
	return []
}

export default function TalksSlug() {
	return null
}
