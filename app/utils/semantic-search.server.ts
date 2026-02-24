import { createHash } from 'node:crypto'
import { z } from 'zod'
import { cache, cachified } from '#app/utils/cache.server.ts'
import { getWorkersAiRunUrl } from '#app/utils/cloudflare-ai-utils.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
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
		v: 1,
		accountId,
		indexName,
		embeddingModel,
		topK,
		query,
	})
	const hash = createHash('sha256').update(payload).digest('hex')
	return `semantic-search:kcd:v1:${hash}`
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
		gatewayId: env.CLOUDFLARE_AI_GATEWAY_ID,
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
			...(init.headers ?? {}),
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
	gatewayId,
	gatewayAuthToken,
	model,
	text,
}: {
	accountId: string
	apiToken: string
	gatewayId: string
	gatewayAuthToken: string
	model: string
	text: string
}) {
	const url = getWorkersAiRunUrl({ accountId, gatewayId, model })
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
	endSeconds: _endSeconds,
}: {
	startSeconds: number | undefined
	endSeconds: number | undefined
}) {
	if (typeof startSeconds !== 'number' || !Number.isFinite(startSeconds)) {
		return undefined
	}

	const safeStart = Math.max(0, startSeconds)

	// Fallback: if `startSeconds` looks like milliseconds (e.g. `123000` for 2:03),
	// normalize defensively. We assume videos in this index aren't 4 hours long.
	// Ambiguous spans (like long chunks in seconds) are left as seconds to avoid
	// false positives from span-only heuristics.
	if (safeStart > 60 * 60 * 4) {
		return Math.max(0, Math.floor(safeStart / 1000))
	}

	return Math.max(0, Math.floor(safeStart))
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
	if (!t) return url

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
	const {
		accountId,
		apiToken,
		gatewayId,
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
				gatewayId,
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

			type RankedResult = { rank: number; result: SemanticSearchResult }
			const byCanonicalId = new Map<string, RankedResult>()

			for (let i = 0; i < matches.length; i++) {
				const m = matches[i]
				if (!m) continue
				const md = (m.metadata ?? {}) as Record<string, unknown>
				const type = asNonEmptyString(md.type)
				const slug = asNonEmptyString(md.slug)
				const title = asNonEmptyString(md.title)
				const url = asNonEmptyString(md.url)
				const snippet = asNonEmptyString(md.snippet)
				// For media (YouTube), chunk metadata can include a start time.
				const timestampSeconds = normalizeYoutubeTimestampSeconds({
					startSeconds: asFiniteNumber(md.startSeconds),
					endSeconds: asFiniteNumber(md.endSeconds),
				})
				const imageUrl = asNonEmptyString(md.imageUrl)
				const imageAlt = asNonEmptyString(md.imageAlt)

				const canonicalId = getCanonicalResultId({
					vectorId: m.id,
					type,
					slug,
					url,
					title,
				})

				const next: SemanticSearchResult = {
					id: canonicalId,
					score: m.score,
					type,
					slug,
					title,
					url,
					snippet,
					timestampSeconds,
					imageUrl,
					imageAlt,
				}

				const existing = byCanonicalId.get(canonicalId)
				if (!existing) {
					byCanonicalId.set(canonicalId, { rank: i, result: next })
					continue
				}

				const prev = existing.result
				const prevScore =
					typeof prev.score === 'number' && Number.isFinite(prev.score)
						? prev.score
						: -Infinity
				const nextScore =
					typeof next.score === 'number' && Number.isFinite(next.score)
						? next.score
						: -Infinity
				const bestScore = Math.max(prevScore, nextScore)
				const nextIsBetter = nextScore > prevScore

				existing.result = {
					id: canonicalId,
					score: bestScore,
					type: prev.type ?? next.type,
					slug: prev.slug ?? next.slug,
					title: prev.title ?? next.title,
					url: prev.url ?? next.url,
					// Prefer the snippet from the highest-scoring chunk, but fall back to any snippet.
					snippet: nextIsBetter
						? (next.snippet ?? prev.snippet)
						: (prev.snippet ?? next.snippet),
					// Keep the timestamp from the highest-scoring chunk when present.
					timestampSeconds: nextIsBetter
						? (next.timestampSeconds ?? prev.timestampSeconds)
						: (prev.timestampSeconds ?? next.timestampSeconds),
					imageUrl: prev.imageUrl ?? next.imageUrl,
					imageAlt: prev.imageAlt ?? next.imageAlt,
				}
			}

			const baseResults = [...byCanonicalId.values()]
				.sort((a, b) => {
					const scoreDiff = (b.result.score ?? 0) - (a.result.score ?? 0)
					if (scoreDiff) return scoreDiff
					return a.rank - b.rank
				})
				.slice(0, safeTopK)
				.map((x) => x.result)

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
