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

function asNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed ? trimmed : undefined
}

function normalizeUrlForKey(url: string): string {
	// Prefer treating absolute URLs and relative paths as the same canonical key.
	try {
		if (/^https?:\/\//i.test(url)) {
			const u = new URL(url)
			return u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : u.pathname
		}
	} catch {
		// ignore
	}
	return url && url !== '/' ? url.replace(/\/+$/, '') : url
}

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
	if (type && slug) return `${type}:${slug}`
	if (type && url) return `${type}:${normalizeUrlForKey(url)}`
	if (url) return normalizeUrlForKey(url)
	if (type && title) return `${type}:${title}`
	return vectorId
}

function getRequiredSemanticSearchEnv() {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = process.env.CLOUDFLARE_API_TOKEN
	const indexName = process.env.CLOUDFLARE_VECTORIZE_INDEX
	const embeddingModel =
		process.env.CLOUDFLARE_AI_EMBEDDING_MODEL ?? '@cf/google/embeddinggemma-300m'

	return { accountId, apiToken, indexName, embeddingModel }
}

export function isSemanticSearchConfigured() {
	const { accountId, apiToken, indexName } = getRequiredSemanticSearchEnv()
	return Boolean(accountId && apiToken && indexName)
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
	model,
	text,
}: {
	accountId: string
	apiToken: string
	model: string
	text: string
}) {
	const res = await cloudflareFetch(accountId, apiToken, `/ai/run/${model}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text: [text] }),
	})
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

export type SemanticSearchResult = {
	id: string
	score: number
	type?: string
	title?: string
	url?: string
	snippet?: string
}

export async function semanticSearchKCD({
	query,
	topK = 15,
}: {
	query: string
	topK?: number
}): Promise<Array<SemanticSearchResult>> {
	const { accountId, apiToken, indexName, embeddingModel } =
		getRequiredSemanticSearchEnv()

	if (!accountId || !apiToken || !indexName) {
		throw new Error(
			'Semantic search is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_VECTORIZE_INDEX.',
		)
	}

	const safeTopK =
		typeof topK === 'number' && Number.isFinite(topK) ? Math.max(1, Math.floor(topK)) : 15
	// Vectorize returns chunk-level matches and overlapping chunks commonly score
	// highly together. Overfetch and then de-dupe down to unique docs.
	// When requesting metadata, Vectorize caps topK at 20.
	const rawTopK = Math.min(20, safeTopK * 5)

	const vector = await getEmbedding({
		accountId,
		apiToken,
		model: embeddingModel,
		text: query,
	})

	const responseJson = await queryVectorize({
		accountId,
		apiToken,
		indexName,
		vector,
		topK: rawTopK,
	})
	const result = (responseJson as any).result ?? responseJson
	const matches = (result?.matches ?? []) as VectorizeQueryResponse['matches']

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
			title,
			url,
			snippet,
		}

		const existing = byCanonicalId.get(canonicalId)
		if (!existing) {
			byCanonicalId.set(canonicalId, { rank: i, result: next })
			continue
		}

		const prev = existing.result
		const prevScore = typeof prev.score === 'number' && Number.isFinite(prev.score) ? prev.score : -Infinity
		const nextScore = typeof next.score === 'number' && Number.isFinite(next.score) ? next.score : -Infinity
		const bestScore = Math.max(prevScore, nextScore)
		const nextIsBetter = nextScore > prevScore

		existing.result = {
			id: canonicalId,
			score: bestScore,
			type: prev.type ?? next.type,
			title: prev.title ?? next.title,
			url: prev.url ?? next.url,
			// Prefer the snippet from the highest-scoring chunk, but fall back to any snippet.
			snippet: nextIsBetter ? next.snippet ?? prev.snippet : prev.snippet ?? next.snippet,
		}
	}

	return [...byCanonicalId.values()]
		.sort((a, b) => {
			const scoreDiff = (b.result.score ?? 0) - (a.result.score ?? 0)
			if (scoreDiff) return scoreDiff
			return a.rank - b.rank
		})
		.slice(0, safeTopK)
		.map((x) => x.result)
}

