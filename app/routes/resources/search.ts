import { data as json } from 'react-router'
import { getDomainUrl } from '#app/utils/misc.ts'
import { semanticSearchKCD } from '#app/utils/semantic-search.server.ts'
import { type Route } from './+types/search'

function normalizeSummary(value: unknown) {
	if (typeof value !== 'string') return undefined
	const text = value.replace(/\s+/g, ' ').trim()
	if (!text) return undefined
	// Keep payloads small for consumers like Discord embeds/autocomplete UIs.
	return text.length > 220 ? `${text.slice(0, 217)}...` : text
}

export async function loader({ request }: Route.LoaderArgs) {
	const query = new URL(request.url).searchParams.get('query')
	const domainUrl = getDomainUrl(request)
	if (typeof query !== 'string' || !query) {
		return json({ error: 'Invalid query' }, { status: 400 })
	}

	const headers = { 'Cache-Control': 'no-store' }

	const results = await semanticSearchKCD({ query, topK: 15, request })
	return json(
		results.map((r) => {
			const url = r.url ?? (r.id.startsWith('/') ? r.id : '')
			const absoluteUrl = url.startsWith('http')
				? url
				: url.startsWith('/')
					? `${domainUrl}${url}`
					: url
						? `${domainUrl}/${url}`
						: domainUrl
			return {
				url: absoluteUrl,
				segment: r.type ?? 'Results',
				title: r.title ?? url ?? r.id,
				summary: normalizeSummary(r.summary ?? r.snippet),
				imageUrl: r.imageUrl,
				imageAlt: r.imageAlt,
			}
		}),
		{ headers },
	)
}
