import { json } from '@remix-run/node'
import { getDomainUrl } from '#app/utils/misc.js'
import { searchKCD } from '#app/utils/search.server.js'

export async function loader({ request }: { request: Request }) {
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	const category = url.searchParams.get('category')

	if (!query) {
		throw new Response('Query parameter is required', { status: 400 })
	}

	const categoryMap: Record<string, string> = {
		Blog: 'b',
		'Chats with Kent Podcast': 'cwk',
		'Call Kent Podcast': 'ckp',
		Workshops: 'w',
		Talks: 't',
	}

	const searchResults = await searchKCD({
		request,
		query: category ? `${categoryMap[category]}:${query}` : query,
	})

	const domainUrl = getDomainUrl(request)

	if (searchResults.length) {
		return json(
			searchResults.map(({ title, route, segment, metadata }) => ({
				title,
				url: `${domainUrl}${route}`,
				category: segment,
				...metadata,
			})),
		)
	}

	return json([])
}
