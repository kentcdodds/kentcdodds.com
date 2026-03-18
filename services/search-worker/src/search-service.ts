import {
	normalizeSearchQuery,
	SearchQueryTooLongError,
	SEARCH_MAX_QUERY_CHARS,
	type SearchResult,
} from '@kcd-internal/search-shared'
import {
	ensureSearchSchema,
	getSearchSyncedAt,
	queryLexicalSearch,
} from './search-db'
import {
	addYoutubeTimestampToUrl,
	asFiniteNumber,
	asNonEmptyString,
	collapseRetrievedMatches,
	filterFusedResultsByConfidence,
	fuseRankedResultsAll,
	normalizeYoutubeTimestampSeconds,
	type RankedDocResult,
} from './search-results'
import { syncSearchArtifacts } from './search-sync'
import { type Env } from './env'

type EmbeddingResponse = {
	shape?: number[]
	data?: number[][]
}

type VectorizeMatch = {
	id: string
	score: number
	metadata?: Record<string, unknown>
}

type SearchDependencies = {
	ensureSchema: () => Promise<void>
	queryLexicalMatches: (args: {
		query: string
		topK: number
	}) => Promise<
		Array<{
			id: string
			type?: string
			slug?: string
			title?: string
			url?: string
			snippet?: string
			startSeconds?: number
			imageUrl?: string
			imageAlt?: string
		}>
	>
	getEmbedding: (args: { text: string; model: string }) => Promise<number[]>
	queryVectorize: (args: {
		vector: number[]
		topK: number
	}) => Promise<Array<VectorizeMatch>>
	getSyncedAt: () => Promise<string | null>
	syncArtifacts: (args: { force?: boolean }) => Promise<{ syncedAt: string }>
}

const SEARCH_TOP_K_MAX = 15
const SEARCH_TOP_K_DEFAULT = 8

function clampTopK(topK: number | undefined) {
	if (typeof topK === 'number' && Number.isFinite(topK)) {
		return Math.max(1, Math.min(SEARCH_TOP_K_MAX, Math.floor(topK)))
	}
	return SEARCH_TOP_K_DEFAULT
}

function isLexicalOnlySearch(env: Env) {
	const v = env.SEARCH_LEXICAL_ONLY?.trim().toLowerCase()
	return v === 'true' || v === '1'
}

function addYoutubeTimestampsToResults(results: Array<SearchResult>) {
	for (const result of results) {
		if (result.type !== 'youtube') continue
		const videoId =
			typeof result.slug === 'string' &&
			/^[A-Za-z0-9_-]{11}$/u.test(result.slug)
				? result.slug
				: null
		result.url = addYoutubeTimestampToUrl({
			url: result.url,
			videoId,
			timestampSeconds: result.timestampSeconds,
		})
	}
	return results
}

export async function getEmbedding({
	env,
	text,
	model,
}: {
	env: Env
	text: string
	model: string
}) {
	const result = (await env.AI.run(
		model as keyof AiModels,
		{ text: [text] } as any,
		{
			gateway: {
				id: env.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID,
			},
		},
	) as EmbeddingResponse)
	const vector = result.data?.[0]
	if (!Array.isArray(vector) || vector.length === 0) {
		throw new Error(
			`Unexpected embedding response shape from Workers AI (model: ${model})`,
		)
	}

	return vector
}

async function queryVectorize({
	env,
	vector,
	topK,
}: {
	env: Env
	vector: number[]
	topK: number
}) {
	const result = await env.SEARCH_INDEX.query(vector, {
		topK,
		returnMetadata: 'all',
	})
	return (result.matches ?? []) as Array<VectorizeMatch>
}

const schemaInitByDb = new WeakMap<D1Database, Promise<void>>()

function createDefaultDependencies(env: Env): SearchDependencies {
	return {
		ensureSchema: async () => {
			let ready = schemaInitByDb.get(env.SEARCH_DB)
			if (!ready) {
				ready = ensureSearchSchema(env.SEARCH_DB).catch((error) => {
					schemaInitByDb.delete(env.SEARCH_DB)
					throw error
				})
				schemaInitByDb.set(env.SEARCH_DB, ready)
			}
			await ready
		},
		queryLexicalMatches: async ({ query, topK }) => {
			return await queryLexicalSearch({
				db: env.SEARCH_DB,
				query,
				topK,
			})
		},
		getEmbedding: async ({ text, model }) => {
			return await getEmbedding({ env, text, model })
		},
		queryVectorize: async ({ vector, topK }) => {
			return await queryVectorize({ env, vector, topK })
		},
		getSyncedAt: async () => {
			return await getSearchSyncedAt(env.SEARCH_DB)
		},
		syncArtifacts: async ({ force }) => {
			return await syncSearchArtifacts({ env, force })
		},
	}
}

export type SearchServiceSearchResult = {
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
}

export function createSearchService(
	env: Env,
	dependencies: SearchDependencies = createDefaultDependencies(env),
) {
	return {
		async search({
			query,
			topK,
		}: {
			query: string
			topK?: number
		}): Promise<SearchServiceSearchResult> {
			const cleanedQuery = normalizeSearchQuery(query)
			if (!cleanedQuery) {
				return {
					results: [],
					lowRankingResults: [],
					noCloseMatches: false,
				}
			}
			if (cleanedQuery.length > SEARCH_MAX_QUERY_CHARS) {
				throw new SearchQueryTooLongError(
					cleanedQuery.length,
					SEARCH_MAX_QUERY_CHARS,
				)
			}

			const safeTopK = clampTopK(topK)
			const rawSemanticTopK = Math.min(50, safeTopK * 5)
			const rawLexicalTopK = Math.min(100, safeTopK * 8)

			await dependencies.ensureSchema()

			const lexicalMatchesPromise = dependencies.queryLexicalMatches({
				query: cleanedQuery,
				topK: rawLexicalTopK,
			})

			if (isLexicalOnlySearch(env)) {
				const lexicalMatches = await lexicalMatchesPromise
				const lexicalResults = collapseRetrievedMatches(
					lexicalMatches.map((match, index) => ({
						rawId: match.id,
						rank: index,
						source: 'lexical' as const,
						type: match.type,
						slug: match.slug,
						title: match.title,
						url: match.url,
						snippet: match.snippet,
						timestampSeconds: normalizeYoutubeTimestampSeconds({
							startSeconds: match.startSeconds,
						}),
						imageUrl: match.imageUrl,
						imageAlt: match.imageAlt,
					})),
				).slice(0, safeTopK * 3)
				const fusedSorted = fuseRankedResultsAll({
					semanticResults: [],
					lexicalResults: lexicalResults as Array<RankedDocResult>,
				})
				const { results, lowRankingResults, noCloseMatches } =
					filterFusedResultsByConfidence({
						fusedSorted,
						topK: safeTopK,
					})
				return {
					results: addYoutubeTimestampsToResults(results),
					lowRankingResults:
						addYoutubeTimestampsToResults(lowRankingResults),
					noCloseMatches,
				}
			}

			const [vector, lexicalMatches] = await Promise.all([
				dependencies.getEmbedding({
					text: cleanedQuery,
					model: env.CLOUDFLARE_AI_EMBEDDING_MODEL,
				}),
				lexicalMatchesPromise,
			])
			const semanticMatches = await dependencies.queryVectorize({
				vector,
				topK: rawSemanticTopK,
			})

			const semanticResults = collapseRetrievedMatches(
				semanticMatches.map((match, index) => {
					const metadata = (match.metadata ?? {}) as Record<string, unknown>
					return {
						rawId: match.id,
						rank: index,
						source: 'semantic' as const,
						score: match.score,
						type: asNonEmptyString(metadata.type),
						slug: asNonEmptyString(metadata.slug),
						title: asNonEmptyString(metadata.title),
						url: asNonEmptyString(metadata.url),
						snippet: asNonEmptyString(metadata.snippet),
						timestampSeconds: normalizeYoutubeTimestampSeconds({
							startSeconds: asFiniteNumber(metadata.startSeconds),
						}),
						imageUrl: asNonEmptyString(metadata.imageUrl),
						imageAlt: asNonEmptyString(metadata.imageAlt),
					}
				}),
			).slice(0, safeTopK * 3)

			const lexicalResults = collapseRetrievedMatches(
				lexicalMatches.map((match, index) => ({
					rawId: match.id,
					rank: index,
					source: 'lexical' as const,
					type: match.type,
					slug: match.slug,
					title: match.title,
					url: match.url,
					snippet: match.snippet,
					timestampSeconds: normalizeYoutubeTimestampSeconds({
						startSeconds: match.startSeconds,
					}),
					imageUrl: match.imageUrl,
					imageAlt: match.imageAlt,
				})),
			).slice(0, safeTopK * 3)

			const fusedSorted = fuseRankedResultsAll({
				semanticResults: semanticResults as Array<RankedDocResult>,
				lexicalResults: lexicalResults as Array<RankedDocResult>,
			})
			const { results, lowRankingResults, noCloseMatches } =
				filterFusedResultsByConfidence({
					fusedSorted,
					topK: safeTopK,
				})

			return {
				results: addYoutubeTimestampsToResults(results),
				lowRankingResults: addYoutubeTimestampsToResults(lowRankingResults),
				noCloseMatches,
			}
		},
		async health() {
			await dependencies.ensureSchema()
			return {
				syncedAt: await dependencies.getSyncedAt(),
			}
		},
		async sync({ force = false }: { force?: boolean } = {}) {
			return await dependencies.syncArtifacts({ force })
		},
	}
}

export type SearchService = ReturnType<typeof createSearchService>
