import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
	normalizeSearchQuery,
	SearchQueryTooLongError,
	SEARCH_MAX_QUERY_CHARS,
	type SearchResult,
} from '@kcd-internal/search-shared'
import { cache, cachified } from '#app/utils/cache.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { getSemanticSearchPresentation } from '#app/utils/semantic-search-presentation.server.ts'
import {
	getSearchWorkerHealth,
	querySearchWorkerResults,
} from '#app/utils/search-worker-client.server.ts'
import { type Timings } from '#app/utils/timing.server.ts'

const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours
const SEARCH_CACHE_SWR_MS = 1000 * 60 * 60 * 24 * 3 // 3 days

const searchResultItemSchema = z
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
	.passthrough()

const searchCachedPayloadV3Schema = z.object({
	v: z.literal(3),
	results: z.array(searchResultItemSchema),
	lowRankingResults: z.array(searchResultItemSchema),
	noCloseMatches: z.boolean(),
})

const searchCachedPayloadSchema = z.union([
	searchCachedPayloadV3Schema,
	z.object({
		v: z.literal(2),
		results: z.array(searchResultItemSchema),
		noCloseMatches: z.boolean(),
		lowRankingResults: z.array(searchResultItemSchema).optional(),
	}),
	z.array(searchResultItemSchema),
])

function makeSearchCacheKey({
	query,
	topK,
	workerUrl,
	searchVersion,
}: {
	query: string
	topK: number
	workerUrl: string
	searchVersion: string
}) {
	const payload = JSON.stringify({
		v: 3,
		workerUrl,
		searchVersion,
		topK,
		query,
	})
	const hash = createHash('sha256').update(payload).digest('hex')
	return `search:kcd:v3:${hash}`
}

function clampTopK(topK: number | undefined) {
	if (typeof topK === 'number' && Number.isFinite(topK)) {
		return Math.max(1, Math.min(15, Math.floor(topK)))
	}
	return 8
}

function normalizeCachedSearchPayload(
	raw: z.infer<typeof searchCachedPayloadSchema>,
): {
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
} {
	if (Array.isArray(raw)) {
		return { results: raw, lowRankingResults: [], noCloseMatches: false }
	}
	return {
		results: raw.results,
		lowRankingResults: raw.lowRankingResults ?? [],
		noCloseMatches: raw.noCloseMatches,
	}
}

async function enrichResults(results: Array<SearchResult>) {
	return await Promise.all(
		results.map(async (result) => {
			const presentation = await getSemanticSearchPresentation(result)
			return { ...result, ...presentation }
		}),
	)
}

export async function searchKCD({
	query,
	topK = 8,
	request,
	timings,
}: {
	query: string
	topK?: number
	request?: Request
	timings?: Timings
}): Promise<{
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
}> {
	const cleanedQuery = normalizeSearchQuery(query)
	if (!cleanedQuery) {
		return { results: [], lowRankingResults: [], noCloseMatches: false }
	}
	if (cleanedQuery.length > SEARCH_MAX_QUERY_CHARS) {
		throw new SearchQueryTooLongError(
			cleanedQuery.length,
			SEARCH_MAX_QUERY_CHARS,
		)
	}

	const safeTopK = clampTopK(topK)
	const workerUrl = getEnv().SEARCH_WORKER_URL
	const fetchPayload = async () => {
		const { results, lowRankingResults, noCloseMatches } =
			await querySearchWorkerResults({
				query: cleanedQuery,
				topK: safeTopK,
			})
		return {
			v: 3 as const,
			results,
			lowRankingResults,
			noCloseMatches,
		}
	}
	const health = await getSearchWorkerHealth().catch(() => null)
	if (!health || health.ok !== true) {
		const payload = await fetchPayload()
		return {
			results: await enrichResults(payload.results),
			lowRankingResults: await enrichResults(payload.lowRankingResults),
			noCloseMatches: payload.noCloseMatches,
		}
	}

	const cacheKey = makeSearchCacheKey({
		query: cleanedQuery,
		topK: safeTopK,
		workerUrl,
		searchVersion: health.syncedAt ?? 'never-synced',
	})

	const cached = await cachified({
		cache,
		request,
		timings,
		key: cacheKey,
		ttl: SEARCH_CACHE_TTL_MS,
		staleWhileRevalidate: SEARCH_CACHE_SWR_MS,
		checkValue: searchCachedPayloadSchema,
		getFreshValue: fetchPayload,
	})

	const { results, lowRankingResults, noCloseMatches } =
		normalizeCachedSearchPayload(cached)
	return {
		results: await enrichResults(results),
		lowRankingResults: await enrichResults(lowRankingResults),
		noCloseMatches,
	}
}
