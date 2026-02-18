import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { getDomainUrl } from '#app/utils/misc.tsx'
import {
	isSemanticSearchConfigured,
	semanticSearchKCD,
} from '#app/utils/semantic-search.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const query = new URL(request.url).searchParams.get('query')
	const domainUrl = getDomainUrl(request)
	if (typeof query !== 'string' || !query) {
		return json({ error: 'Invalid query' }, { status: 400 })
	}

	const headers = { 'Cache-Control': 'no-store' }

	if (!isSemanticSearchConfigured()) {
		return json(
			{
				error:
					'Semantic search is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_VECTORIZE_INDEX.',
			},
			{ status: 503, headers },
		)
	}

	const results = await semanticSearchKCD({ query, topK: 15 })
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
			}
		}),
		{ headers },
	)
}
