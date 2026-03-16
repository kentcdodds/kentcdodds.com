import { createHash } from 'node:crypto'
import { z } from 'zod'
import { cache, cachified } from '#app/utils/cache.server.ts'
import { getWorkersAiRunUrl } from '#app/utils/cloudflare-ai-utils.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import {
	ensureLexicalSearchReady,
	queryLexicalSearch,
} from '#app/utils/lexical-search.server.ts'
import { getSemanticSearchPresentation } from '#app/utils/semantic-search-presentation.server.ts'
import { type Timings } from '#app/utils/timing.server.ts'

type EmbeddingResponse = {
	shape?: number[]
	data?: number[][]
}

type VectorizeQueryResponse = {
	count: number
	matches: Array<{
		id: string
		score: number
		metadata?: Record<string, unknown>
	}>
}

const SEMANTIC_SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours
const SEMANTIC_SEARCH_CACHE_SWR_MS = 1000 * 60 * 60 * 24 * 3 // 3 days
export const SEMANTIC_SEARCH_MAX_QUERY_CHARS = 1000

export class SemanticSearchQueryTooLongError extends Error {
	length: number
	max: number

	constructor(length: number, max: number) {
		super(`Semantic search query too long (${length} chars). Max is ${max}.`)
		this.name = 'SemanticSearchQueryTooLongError'
		this.length = length
		this.max = max
	}
}

/**
 * Normalize a user-provided query into a stable cache key input.
 */
function normalizeSemanticSearchQueryForCache(query: string) {
	// Normalize insignificant whitespace so repeated requests hit cache.
	return query.trim().replace(/\s+/g, ' ')
}

/**
 * Build a stable, privacy-preserving cache key for semantic search results.
 */
function makeSemanticSearchCacheKey({
	query,
	topK,
	accountId,
	indexName,
	embeddingModel,
}: {
	query: string
	topK: number
	accountId: string
	indexName: string
	embeddingModel: string
}) {
	// Hash the query payload to:
	// - avoid massive cache keys for long queries
	// - avoid storing potentially sensitive user queries in plaintext keys
	const payload = JSON.stringify({
		v: 2,
		accountId,
		indexName,
		embeddingModel,
		topK,
		query,
	})
	const hash = createHash('sha256').update(payload).digest('hex')
	return `semantic-search:kcd:v2:${hash}`
}

function asFiniteNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string' && value.trim()) {
		const n = Number(value)
		if (Number.isFinite(n)) return n
	}
	return undefined
}

/**
 * Parse a value that may be a string, returning a trimmed non-empty string.
 */
function asNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed ? trimmed : undefined
}

/**
 * Normalize a URL/path into a stable key:
 * - absolute URLs -> pathname
 * - relative paths -> strip query/fragment and trailing slashes
 */
function normalizeUrlForKey(url: string): string {
	// Prefer treating absolute URLs and relative paths as the same canonical key.
	try {
		if (/^https?:\/\//i.test(url)) {
			const u = new URL(url)
			return u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : u.pathname
		}
	} catch {
		// ignore
	}
	const cleaned = (url.split(/[?#]/)[0] ?? '').trim()
	if (!cleaned) return '/'
	return cleaned !== '/' ? cleaned.replace(/\/+$/, '') : cleaned
}

/**
 * Normalize a title for canonicalization (case-insensitive).
 */
function normalizeTitleForKey(title: string) {
	// asNonEmptyString already trims; use lowercase to avoid casing-only duplicates.
	return title.toLowerCase()
}

function normalizeSlugForKey(slug: string) {
	// Normalize for case-insensitive dedupe parity with titles.
	return slug.toLowerCase()
}

function parseDocRefFromVectorId(
	vectorId: string,
): { type: string; slug: string } | null {
	// Indexers generally use `<type>:<slug>:chunk:<n>` for chunk-level vectors.
	// When metadata is missing/incomplete, we can still collapse chunk hits into a
	// doc-level hit using the stable vector id structure.
	const match =
		/^(?<type>[^:]+):(?<slug>[^:]+):chunk:(?<chunkIndex>\d+)$/u.exec(vectorId)
	const type = match?.groups?.type
	const slug = match?.groups?.slug
	if (!type || !slug) return null
	return { type, slug }
}

/**
 * Compute a doc-level identifier for semantic search results.
 *
 * Vectorize stores one vector per chunk; the canonical ID collapses chunk hits
 * into a single doc hit so search results don't contain duplicates.
 */
function getCanonicalResultId({
	vectorId,
	type,
	slug,
	url,
	title,
}: {
	vectorId: string
	type: string | undefined
	slug: string | undefined
	url: string | undefined
	title: string | undefined
}) {
	// The Vectorize index stores multiple chunk vectors per doc, so we need a
	// canonical, doc-level identifier to collapse duplicates in query results.
	if (type === 'youtube') {
		if (slug) return `${type}:${normalizeSlugForKey(slug)}`
		// Legacy vectors may omit `slug`; recover stable doc identity from URL.
		const youtubeVideoId = parseYoutubeVideoIdFromUrl(url)
		if (youtubeVideoId) return `${type}:${normalizeSlugForKey(youtubeVideoId)}`
	}
	if (type && slug) return `${type}:${normalizeSlugForKey(slug)}`
	const fromVectorId = parseDocRefFromVectorId(vectorId)
	if (fromVectorId) {
		return `${fromVectorId.type}:${normalizeSlugForKey(fromVectorId.slug)}`
	}
	const normalizedUrl = url ? normalizeUrlForKey(url) : undefined
	if (type && normalizedUrl) return `${type}:${normalizedUrl}`
	if (normalizedUrl) return normalizedUrl
	if (type && title) return `${type}:${normalizeTitleForKey(title)}`
	return vectorId
}

function getRequiredSemanticSearchEnv() {
	const env = getEnv()
	return {
		accountId: env.CLOUDFLARE_ACCOUNT_ID,
		apiToken: env.CLOUDFLARE_API_TOKEN,
		embeddingGatewayId: env.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID,
		gatewayAuthToken: env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN,
		indexName: env.CLOUDFLARE_VECTORIZE_INDEX,
		embeddingModel: env.CLOUDFLARE_AI_EMBEDDING_MODEL,
	}
}

function getCloudflareApiBaseUrl() {
	return 'https://api.cloudflare.com/client/v4'
}

async function cloudflareFetch(
	accountId: string,
	apiToken: string,
	path: string,
	init: RequestInit,
) {
	const url = `${getCloudflareApiBaseUrl()}/accounts/${accountId}${path}`
	const res = await fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${apiToken}`,
			...init.headers,
		},
	})

	if (!res.ok) {
		let bodyText = ''
		try {
			bodyText = await res.text()
		} catch {
			// ignore
		}
		throw new Error(
			`Cloudflare API request failed: ${res.status} ${res.statusText} (${path})${bodyText ? `\n${bodyText}` : ''}`,
		)
	}
	return res
}

async function getEmbedding({
	accountId,
	apiToken,
	embeddingGatewayId,
	gatewayAuthToken,
	model,
	text,
}: {
	accountId: string
	apiToken: string
	embeddingGatewayId: string
	gatewayAuthToken: string
	model: string
	text: string
}) {
	const url = getWorkersAiRunUrl({
		accountId,
		gatewayId: embeddingGatewayId,
		model,
	})
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'cf-aig-authorization': `Bearer ${gatewayAuthToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ text: [text] }),
	})
	if (!res.ok) {
		let bodyText = ''
		try {
			bodyText = await res.text()
		} catch {
			// ignore
		}
		throw new Error(
			`Cloudflare API request failed: ${res.status} ${res.statusText} (/ai/run/${model})${bodyText ? `\n${bodyText}` : ''}`,
		)
	}
	const json = (await res.json()) as any

	// REST responses typically wrap in { result: ... }, whereas Workers runtime
	// returns the embedding response directly.
	const result: EmbeddingResponse = (json?.result ?? json) as any
	const vector = result?.data?.[0]
	if (!Array.isArray(vector) || vector.length === 0) {
		throw new Error(
			`Unexpected embedding response shape from Workers AI (model: ${model})`,
		)
	}
	return vector
}

async function queryVectorize({
	accountId,
	apiToken,
	indexName,
	vector,
	topK,
}: {
	accountId: string
	apiToken: string
	indexName: string
	vector: number[]
	topK: number
}) {
	// Vectorize has both legacy and V2 HTTP APIs. Prefer v2; fall back to legacy path.
	const body = JSON.stringify({
		vector,
		topK,
		returnMetadata: 'all',
	})

	try {
		const res = await cloudflareFetch(
			accountId,
			apiToken,
			`/vectorize/v2/indexes/${indexName}/query`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
			},
		)
		return (await res.json()) as { result?: VectorizeQueryResponse } & Record<
			string,
			unknown
		>
	} catch {
		// If the index is legacy or the endpoint differs, try the non-v2 path.
		const res = await cloudflareFetch(
			accountId,
			apiToken,
			`/vectorize/indexes/${indexName}/query`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
			},
		)
		return (await res.json()) as { result?: VectorizeQueryResponse } & Record<
			string,
			unknown
		>
	}
}

export async function vectorizeDeleteByIds({
	ids,
}: {
	ids: string[]
}): Promise<unknown> {
	const { accountId, apiToken, indexName } = getRequiredSemanticSearchEnv()
	if (!Array.isArray(ids) || ids.length === 0) {
		return { result: { deleted: 0 } }
	}

	const body = JSON.stringify({ ids })
	const doFetch = (path: string) => {
		const url = `${getCloudflareApiBaseUrl()}/accounts/${accountId}${path}`
		return fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body,
		})
	}
	const throwIfNotOk = async (res: Response, path: string) => {
		if (res.ok) return
		const text = await res.text().catch(() => '')
		throw new Error(
			`Cloudflare API request failed: ${res.status} ${res.statusText} (${path})${text ? `\n${text}` : ''}`,
		)
	}

	const v2Path = `/vectorize/v2/indexes/${indexName}/delete_by_ids`
	const v2Res = await doFetch(v2Path)
	if (v2Res.status === 404 || v2Res.status === 405) {
		const legacyPath = `/vectorize/indexes/${indexName}/delete_by_ids`
		const legacyRes = await doFetch(legacyPath)
		await throwIfNotOk(legacyRes, legacyPath)
		return (await legacyRes.json()) as unknown
	}

	await throwIfNotOk(v2Res, v2Path)
	return (await v2Res.json()) as unknown
}

export type SemanticSearchResult = {
	id: string
	score: number
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	/**
	 * Optional deep-link timestamp (seconds) for media results like YouTube.
	 * When present, UIs can open the result at the approximate match location.
	 */
	timestampSeconds?: number
	/**
	 * A short, display-friendly summary. Prefer this over `snippet` in UIs.
	 */
	summary?: string
	imageUrl?: string
	imageAlt?: string
}

const semanticSearchResultsSchema = z.array(
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

type RetrievedMatch = {
	rawId: string
	rank: number
	source: 'semantic' | 'lexical'
	score?: number
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	timestampSeconds?: number
	imageUrl?: string
	imageAlt?: string
}

type RankedDocResult = {
	rank: number
	result: SemanticSearchResult
}

function compareRetrievedMatchQuality(
	next: RetrievedMatch,
	prev: RetrievedMatch,
): number {
	const nextScore =
		typeof next.score === 'number' && Number.isFinite(next.score)
			? next.score
			: -Infinity
	const prevScore =
		typeof prev.score === 'number' && Number.isFinite(prev.score)
			? prev.score
			: -Infinity
	if (nextScore !== prevScore) return nextScore - prevScore
	return prev.rank - next.rank
}

function collapseRetrievedMatches(matches: Array<RetrievedMatch>) {
	const byCanonicalId = new Map<string, { rank: number; match: RetrievedMatch }>()

	for (const match of matches) {
		const canonicalId = getCanonicalResultId({
			vectorId: match.rawId,
			type: match.type,
			slug: match.slug,
			url: match.url,
			title: match.title,
		})

		const existing = byCanonicalId.get(canonicalId)
		if (!existing) {
			byCanonicalId.set(canonicalId, { rank: match.rank, match })
			continue
		}

		const nextIsBetter = compareRetrievedMatchQuality(match, existing.match) > 0
		const prev = existing.match
		const next = match
		existing.rank = Math.min(existing.rank, match.rank)
		existing.match = {
			rawId: nextIsBetter ? next.rawId : prev.rawId,
			source: prev.source,
			rank: Math.min(prev.rank, next.rank),
			score:
				typeof prev.score === 'number' || typeof next.score === 'number'
					? Math.max(prev.score ?? -Infinity, next.score ?? -Infinity)
					: undefined,
			type: prev.type ?? next.type,
			slug: prev.slug ?? next.slug,
			title: prev.title ?? next.title,
			url: prev.url ?? next.url,
			snippet: nextIsBetter
				? (next.snippet ?? prev.snippet)
				: (prev.snippet ?? next.snippet),
			timestampSeconds: nextIsBetter
				? (next.timestampSeconds ?? prev.timestampSeconds)
				: (prev.timestampSeconds ?? next.timestampSeconds),
			imageUrl: prev.imageUrl ?? next.imageUrl,
			imageAlt: prev.imageAlt ?? next.imageAlt,
		}
	}

	return [...byCanonicalId.entries()]
		.map(([id, value]) => ({
			rank: value.rank,
			result: {
				id,
				score: value.match.score ?? 0,
				type: value.match.type,
				slug: value.match.slug,
				title: value.match.title,
				url: value.match.url,
				snippet: value.match.snippet,
				timestampSeconds: value.match.timestampSeconds,
				imageUrl: value.match.imageUrl,
				imageAlt: value.match.imageAlt,
			} satisfies SemanticSearchResult,
		}))
		.sort((a, b) => {
			const scoreDiff = (b.result.score ?? 0) - (a.result.score ?? 0)
			if (scoreDiff) return scoreDiff
			return a.rank - b.rank
		})
}

function fuseRankedResults({
	semanticResults,
	lexicalResults,
	topK,
}: {
	semanticResults: Array<RankedDocResult>
	lexicalResults: Array<RankedDocResult>
	topK: number
}) {
	const rankConstant = 60
	const weights = {
		semantic: 1,
		lexical: 1.15,
	} as const

	const fused = new Map<
		string,
		{
			score: number
			result: SemanticSearchResult
		}
	>()

	const apply = (
		source: keyof typeof weights,
		items: Array<RankedDocResult>,
	) => {
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (!item) continue
			const contribution = weights[source] / (rankConstant + i + 1)
			const existing = fused.get(item.result.id)
			if (!existing) {
				fused.set(item.result.id, {
					score: contribution,
					result: {
						...item.result,
						score: contribution,
					},
				})
				continue
			}

			existing.score += contribution
			const shouldReplaceRepresentative =
				contribution > (existing.result.score ?? 0)
			existing.result = {
				id: item.result.id,
				score: existing.score,
				type: existing.result.type ?? item.result.type,
				slug: existing.result.slug ?? item.result.slug,
				title: existing.result.title ?? item.result.title,
				url: existing.result.url ?? item.result.url,
				snippet: shouldReplaceRepresentative
					? (item.result.snippet ?? existing.result.snippet)
					: (existing.result.snippet ?? item.result.snippet),
				timestampSeconds: shouldReplaceRepresentative
					? (item.result.timestampSeconds ?? existing.result.timestampSeconds)
					: (existing.result.timestampSeconds ?? item.result.timestampSeconds),
				imageUrl: existing.result.imageUrl ?? item.result.imageUrl,
				imageAlt: existing.result.imageAlt ?? item.result.imageAlt,
			}
		}
	}

	apply('semantic', semanticResults)
	apply('lexical', lexicalResults)

	return [...fused.values()]
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map((entry) => ({
			...entry.result,
			score: entry.score,
		}))
}

function parseYoutubeVideoIdFromUrl(url: string | undefined) {
	if (!url) return null
	try {
		const u = new URL(url, 'https://kentcdodds.com')
		if (u.pathname !== '/youtube') return null
		const video = (u.searchParams.get('video') ?? '').trim()
		return /^[A-Za-z0-9_-]{11}$/.test(video) ? video : null
	} catch {
		return null
	}
}

function normalizeYoutubeTimestampSeconds({
	startSeconds,
}: {
	startSeconds: number | undefined
}) {
	if (typeof startSeconds !== 'number' || !Number.isFinite(startSeconds)) {
		return undefined
	}

	let safeStart = Math.max(0, Math.floor(startSeconds))
	const msHeuristicThresholdSeconds = 60 * 60 * 24
	if (safeStart > msHeuristicThresholdSeconds) {
		safeStart = Math.floor(safeStart / 1000)
	}
	return safeStart
}

function addYoutubeTimestampToUrl({
	url,
	videoId,
	timestampSeconds,
}: {
	url: string | undefined
	videoId: string | null
	timestampSeconds: number | undefined
}) {
	const t =
		typeof timestampSeconds === 'number' && Number.isFinite(timestampSeconds)
			? Math.max(0, Math.floor(timestampSeconds))
			: null
	if (t === null) return url

	const vid = videoId ?? parseYoutubeVideoIdFromUrl(url)
	if (!vid) return url

	const base = url && url.startsWith('/youtube') ? url : `/youtube?video=${vid}`
	try {
		const u = new URL(base, 'https://kentcdodds.com')
		u.searchParams.set('video', vid)
		u.searchParams.set('t', String(t))
		return `${u.pathname}?${u.searchParams.toString()}`
	} catch {
		return `/youtube?video=${encodeURIComponent(vid)}&t=${encodeURIComponent(
			String(t),
		)}`
	}
}

export async function semanticSearchKCD({
	query,
	topK = 15,
	request,
	timings,
}: {
	query: string
	/**
	 * Requested number of unique docs to return.
	 * Clamped to 20 because Vectorize metadata queries cap `topK` at 20.
	 * Because chunk overfetch is capped at 20 as well, very high `topK` values
	 * may return fewer than requested unique docs after de-duping chunk hits.
	 */
	topK?: number
	request?: Request
	timings?: Timings
}): Promise<Array<SemanticSearchResult>> {
	const cleanedQuery = normalizeSemanticSearchQueryForCache(query)
	if (!cleanedQuery) return []
	if (cleanedQuery.length > SEMANTIC_SEARCH_MAX_QUERY_CHARS) {
		throw new SemanticSearchQueryTooLongError(
			cleanedQuery.length,
			SEMANTIC_SEARCH_MAX_QUERY_CHARS,
		)
	}
	const {
		accountId,
		apiToken,
		embeddingGatewayId,
		gatewayAuthToken,
		indexName,
		embeddingModel,
	} = getRequiredSemanticSearchEnv()

	const safeTopK =
		typeof topK === 'number' && Number.isFinite(topK)
			? Math.max(1, Math.min(20, Math.floor(topK)))
			: 15

	const cacheKey = makeSemanticSearchCacheKey({
		query: cleanedQuery,
		topK: safeTopK,
		accountId,
		indexName,
		embeddingModel,
	})

	// Vectorize returns chunk-level matches and overlapping chunks commonly score
	// highly together. Overfetch and then de-dupe down to unique docs.
	// Vectorize metadata queries cap topK at 20, so rawTopK is capped too (this
	// can limit overfetch headroom for de-dupe at high `topK` values).
	const rawTopK = Math.min(20, safeTopK * 5)

	const baseResults = await cachified({
		cache,
		request,
		timings,
		key: cacheKey,
		ttl: SEMANTIC_SEARCH_CACHE_TTL_MS,
		staleWhileRevalidate: SEMANTIC_SEARCH_CACHE_SWR_MS,
		checkValue: semanticSearchResultsSchema,
		getFreshValue: async () => {
			const vector = await getEmbedding({
				accountId,
				apiToken,
				embeddingGatewayId,
				gatewayAuthToken,
				model: embeddingModel,
				text: cleanedQuery,
			})

			const responseJson = await queryVectorize({
				accountId,
				apiToken,
				indexName,
				vector,
				topK: rawTopK,
			})
			const result = (responseJson as any).result ?? responseJson
			const matches = (result?.matches ??
				[]) as VectorizeQueryResponse['matches']
			const semanticResults = collapseRetrievedMatches(
				matches.map((m, i) => {
					const md = (m.metadata ?? {}) as Record<string, unknown>
					return {
						rawId: m.id,
						rank: i,
						source: 'semantic' as const,
						score: m.score,
						type: asNonEmptyString(md.type),
						slug: asNonEmptyString(md.slug),
						title: asNonEmptyString(md.title),
						url: asNonEmptyString(md.url),
						snippet: asNonEmptyString(md.snippet),
						timestampSeconds: normalizeYoutubeTimestampSeconds({
							startSeconds: asFiniteNumber(md.startSeconds),
						}),
						imageUrl: asNonEmptyString(md.imageUrl),
						imageAlt: asNonEmptyString(md.imageAlt),
					} satisfies RetrievedMatch
				}),
			).slice(0, safeTopK * 3)

			let lexicalResults: Array<RankedDocResult> = []
			try {
				await ensureLexicalSearchReady()
				const lexicalMatches = queryLexicalSearch({
					query: cleanedQuery,
					topK: Math.min(100, safeTopK * 8),
				})
				lexicalResults = collapseRetrievedMatches(
					lexicalMatches.map((match, i) => ({
						rawId: match.id,
						rank: i,
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
					} satisfies RetrievedMatch)),
				).slice(0, safeTopK * 3)
			} catch (error) {
				console.error('Lexical search unavailable, continuing with semantic only', error)
			}

			const baseResults = fuseRankedResults({
				semanticResults,
				lexicalResults,
				topK: safeTopK,
			})

			// If a YouTube chunk match includes a timestamp, deep-link the result URL.
			for (const r of baseResults) {
				if (r.type !== 'youtube') continue
				const videoId =
					typeof r.slug === 'string' && /^[A-Za-z0-9_-]{11}$/.test(r.slug)
						? r.slug
						: null
				r.url = addYoutubeTimestampToUrl({
					url: r.url,
					videoId,
					timestampSeconds: r.timestampSeconds,
				})
			}

			return baseResults
		},
	})

	// Add UI-ready presentation fields (summary + image) per-request. This is
	// derived from local repo content when possible, so caching it would delay
	// reflecting content updates until TTL/SWR expiry.
	return await Promise.all(
		baseResults.map(async (r) => {
			const presentation = await getSemanticSearchPresentation(r)
			return { ...r, ...presentation }
		}),
	)
}
