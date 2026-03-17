import {
	normalizeSearchQuery,
	SearchQueryTooLongError,
	SEARCH_MAX_QUERY_CHARS,
	type SearchResult,
} from './search-shared'
import { ensureSearchSchema, queryLexicalSearch } from './search-db'
import {
	addYoutubeTimestampToUrl,
	asFiniteNumber,
	asNonEmptyString,
	collapseRetrievedMatches,
	fuseRankedResults,
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
	syncArtifacts: (args: { force?: boolean }) => Promise<{ syncedAt: string }>
}

function clampTopK(topK: number | undefined) {
	if (typeof topK === 'number' && Number.isFinite(topK)) {
		return Math.max(1, Math.min(20, Math.floor(topK)))
	}
	return 15
}

export function getWorkersAiRunUrl({
	env,
	model,
}: {
	env: Env
	model: string
}) {
	return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID}/workers-ai/${model}`
}

async function getEmbedding({
	env,
	text,
	model,
}: {
	env: Env
	text: string
	model: string
}) {
	const response = await fetch(getWorkersAiRunUrl({ env, model }), {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
			'cf-aig-authorization': `Bearer ${env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ text: [text] }),
	})
	if (!response.ok) {
		const bodyText = await response.text().catch(() => '')
		throw new Error(
			`Workers AI embedding request failed: ${response.status} ${response.statusText}${bodyText ? `\n${bodyText}` : ''}`,
		)
	}

	const json = (await response.json()) as { result?: EmbeddingResponse } & Record<
		string,
		unknown
	>
	const result = (json.result ?? json) as EmbeddingResponse
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

function createDefaultDependencies(env: Env): SearchDependencies {
	return {
		ensureSchema: async () => {
			await ensureSearchSchema(env.SEARCH_DB)
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
		syncArtifacts: async ({ force }) => {
			return await syncSearchArtifacts({ env, force })
		},
	}
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
			const rawSemanticTopK = Math.min(50, safeTopK * 5)
			const rawLexicalTopK = Math.min(100, safeTopK * 8)

			await dependencies.ensureSchema()

			const lexicalMatchesPromise = dependencies.queryLexicalMatches({
				query: cleanedQuery,
				topK: rawLexicalTopK,
			})
			const vector = await dependencies.getEmbedding({
				text: cleanedQuery,
				model: env.CLOUDFLARE_AI_EMBEDDING_MODEL,
			})
			const [semanticMatches, lexicalMatches] = await Promise.all([
				dependencies.queryVectorize({
					vector,
					topK: rawSemanticTopK,
				}),
				lexicalMatchesPromise,
			])

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

			const fusedResults = fuseRankedResults({
				semanticResults: semanticResults as Array<RankedDocResult>,
				lexicalResults: lexicalResults as Array<RankedDocResult>,
				topK: safeTopK,
			})

			for (const result of fusedResults) {
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

			return fusedResults
		},
		async sync({ force = false }: { force?: boolean } = {}) {
			return await dependencies.syncArtifacts({ force })
		},
	}
}

export type SearchService = ReturnType<typeof createSearchService>
