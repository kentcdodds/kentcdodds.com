type EmbeddingResponse = {
	shape?: number[]
	data?: number[][]
}

function getApiBaseUrl() {
	return 'https://api.cloudflare.com/client/v4'
}

function getRequiredEnv(name: string) {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

export function getCloudflareConfig() {
	return {
		accountId: getRequiredEnv('CLOUDFLARE_ACCOUNT_ID'),
		apiToken: getRequiredEnv('CLOUDFLARE_API_TOKEN'),
		vectorizeIndex: getRequiredEnv('CLOUDFLARE_VECTORIZE_INDEX'),
		embeddingModel:
			process.env.CLOUDFLARE_AI_EMBEDDING_MODEL ?? '@cf/google/embeddinggemma-300m',
	}
}

async function cfFetch(
	{
		accountId,
		apiToken,
	}: { accountId: string; apiToken: string },
	path: string,
	init: RequestInit,
) {
	const url = `${getApiBaseUrl()}/accounts/${accountId}${path}`
	const res = await fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${apiToken}`,
			...(init.headers ?? {}),
		},
	})
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(
			`Cloudflare API error: ${res.status} ${res.statusText} (${path})${text ? `\n${text}` : ''}`,
		)
	}
	return res
}

export async function getEmbeddings({
	accountId,
	apiToken,
	model,
	texts,
}: {
	accountId: string
	apiToken: string
	model: string
	texts: string[]
}) {
	const res = await cfFetch({ accountId, apiToken }, `/ai/run/${model}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text: texts }),
	})
	const json = (await res.json()) as any
	const result: EmbeddingResponse = (json?.result ?? json) as any
	if (!Array.isArray(result?.data) || result.data.length !== texts.length) {
		throw new Error(`Unexpected embedding response from Workers AI`)
	}
	return result.data
}

export type VectorizeVector = {
	id: string
	values: number[]
	metadata?: Record<string, unknown>
	namespace?: string
}

function vectorsToNdjson(vectors: VectorizeVector[]) {
	return `${vectors.map((v) => JSON.stringify(v)).join('\n')}\n`
}

async function vectorizeWriteNdjson({
	accountId,
	apiToken,
	indexName,
	operation,
	vectors,
}: {
	accountId: string
	apiToken: string
	indexName: string
	operation: 'insert' | 'upsert'
	vectors: VectorizeVector[]
}) {
	// Cloudflare documents the V2 HTTP API as multipart form upload where the
	// `vectors` field is an NDJSON file.
	// Example: POST /vectorize/v2/indexes/{index}/insert
	const ndjson = vectorsToNdjson(vectors)
	const form = new FormData()
	form.set('vectors', new Blob([ndjson], { type: 'application/x-ndjson' }), 'vectors.ndjson')

	const pathV2 = `/vectorize/v2/indexes/${indexName}/${operation}`
	try {
		const res = await cfFetch({ accountId, apiToken }, pathV2, {
			method: 'POST',
			body: form,
		})
		return (await res.json()) as any
	} catch {
		// Fallback for legacy indexes if needed.
		const pathLegacy = `/vectorize/indexes/${indexName}/${operation}`
		const res = await cfFetch({ accountId, apiToken }, pathLegacy, {
			method: 'POST',
			body: form,
		})
		return (await res.json()) as any
	}
}

export async function vectorizeUpsert({
	accountId,
	apiToken,
	indexName,
	vectors,
}: {
	accountId: string
	apiToken: string
	indexName: string
	vectors: VectorizeVector[]
}) {
	return vectorizeWriteNdjson({ accountId, apiToken, indexName, operation: 'upsert', vectors })
}

export async function vectorizeDeleteByIds({
	accountId,
	apiToken,
	indexName,
	ids,
}: {
	accountId: string
	apiToken: string
	indexName: string
	ids: string[]
}) {
	const body = JSON.stringify({ ids })
	try {
		const res = await cfFetch(
			{ accountId, apiToken },
			`/vectorize/v2/indexes/${indexName}/delete_by_ids`,
			{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
		)
		return (await res.json()) as any
	} catch {
		const res = await cfFetch(
			{ accountId, apiToken },
			`/vectorize/indexes/${indexName}/delete_by_ids`,
			{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
		)
		return (await res.json()) as any
	}
}

