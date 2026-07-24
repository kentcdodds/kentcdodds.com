import { data as json } from 'react-router'
import {
	SearchQueryTooLongError,
	SearchWorkerTimeoutError,
} from '@kcd-internal/search-shared'
import { getDomainUrl } from '#app/utils/misc.ts'
import { searchKCD } from '#app/utils/search.server.ts'
import { type Route } from './+types/search'

const SEARCH_UNAVAILABLE_MESSAGE =
	'Search is temporarily unavailable. Please try again.'

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

	let payload
	try {
		payload = await searchKCD({ query, topK: 15, request })
	} catch (error) {
		if (error instanceof SearchQueryTooLongError) {
			return json({ error: error.message }, { status: 400, headers })
		}
		// Non-critical resource: degrade for upstream timeouts instead of 500ing
		// into Sentry (navbar already renders `{ error }` as a soft message).
		if (error instanceof SearchWorkerTimeoutError) {
			console.warn(error)
			return json(
				{ error: SEARCH_UNAVAILABLE_MESSAGE },
				{ status: 503, headers },
			)
		}
		throw error
	}
	return json(
		{
			noCloseMatches: payload.noCloseMatches,
			results: payload.results.map((r) => {
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
		},
		{ headers },
	)
}
