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
		topK,
	})
	const result = (responseJson as any).result ?? responseJson
	const matches = (result?.matches ?? []) as VectorizeQueryResponse['matches']

	return matches.map((m) => {
		const md = (m.metadata ?? {}) as Record<string, unknown>
		return {
			id: m.id,
			score: m.score,
			type: typeof md.type === 'string' ? md.type : undefined,
			title: typeof md.title === 'string' ? md.title : undefined,
			url: typeof md.url === 'string' ? md.url : undefined,
			snippet: typeof md.snippet === 'string' ? md.snippet : undefined,
		}
	})
}

