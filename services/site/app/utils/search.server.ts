import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
	normalizeSearchQuery,
	SearchQueryTooLongError,
	SEARCH_MAX_QUERY_CHARS,
	type SearchResult,
} from '#other/search/search-service.ts'
import { cache, cachified } from '#app/utils/cache.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { getSemanticSearchPresentation } from '#app/utils/semantic-search-presentation.server.ts'
import { querySearchWorkerResults } from '#app/utils/search-worker-client.server.ts'
import { type Timings } from '#app/utils/timing.server.ts'

const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours
const SEARCH_CACHE_SWR_MS = 1000 * 60 * 60 * 24 * 3 // 3 days

const searchResultsSchema = z.array(
	z
		.object({
			id: z.string(),
			score: z.number(),
			type: z.string().optional(),
			slug: z.string().optional(),
			title: z.string().optional(),
			url: z.string().optional(),
			snippet: z.string().optional(),
			timestampSeconds: z.number().optional(),
			summary: z.string().optional(),
			imageUrl: z.string().optional(),
			imageAlt: z.string().optional(),
		})
		.passthrough(),
)

function makeSearchCacheKey({
	query,
	topK,
	workerUrl,
}: {
	query: string
	topK: number
	workerUrl: string
}) {
	const payload = JSON.stringify({
		v: 1,
		workerUrl,
		topK,
		query,
	})
	const hash = createHash('sha256').update(payload).digest('hex')
	return `search:kcd:v1:${hash}`
}

function clampTopK(topK: number | undefined) {
	if (typeof topK === 'number' && Number.isFinite(topK)) {
		return Math.max(1, Math.min(20, Math.floor(topK)))
	}
	return 15
}

export async function searchKCD({
	query,
	topK = 15,
	request,
	timings,
}: {
	query: string
	topK?: number
	request?: Request
	timings?: Timings
}): Promise<Array<SearchResult>> {
	const cleanedQuery = normalizeSearchQuery(query)
	if (!cleanedQuery) return []
	if (cleanedQuery.length > SEARCH_MAX_QUERY_CHARS) {
		throw new SearchQueryTooLongError(
			cleanedQuery.length,
			SEARCH_MAX_QUERY_CHARS,
		)
	}

	const safeTopK = clampTopK(topK)
	const workerUrl = getEnv().SEARCH_WORKER_URL
	const cacheKey = makeSearchCacheKey({
		query: cleanedQuery,
		topK: safeTopK,
		workerUrl,
	})

	const baseResults = await cachified({
		cache,
		request,
		timings,
		key: cacheKey,
		ttl: SEARCH_CACHE_TTL_MS,
		staleWhileRevalidate: SEARCH_CACHE_SWR_MS,
		checkValue: searchResultsSchema,
		getFreshValue: async () => {
			return await querySearchWorkerResults({
				query: cleanedQuery,
				topK: safeTopK,
			})
		},
	})

	return await Promise.all(
		baseResults.map(async (result) => {
			const presentation = await getSemanticSearchPresentation(result)
			return { ...result, ...presentation }
		}),
	)
}
