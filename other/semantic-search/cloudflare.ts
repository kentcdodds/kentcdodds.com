type EmbeddingResponse = {
	shape?: number[]
	data?: number[][]
}

function getApiBaseUrl() {
	return (
		process.env.CLOUDFLARE_API_BASE_URL ?? 'https://api.cloudflare.com/client/v4'
	)
}

function getGatewayBaseUrl() {
	return (
		process.env.CLOUDFLARE_AI_GATEWAY_BASE_URL ??
		'https://gateway.ai.cloudflare.com/v1'
	)
}

function getRequiredEnv(name: string) {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

export function getCloudflareConfig() {
	const defaultGatewayId = getRequiredEnv('CLOUDFLARE_AI_GATEWAY_ID')
	const embeddingGatewayId =
		process.env.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID?.trim() || defaultGatewayId

	return {
		accountId: getRequiredEnv('CLOUDFLARE_ACCOUNT_ID'),
		apiToken: getRequiredEnv('CLOUDFLARE_API_TOKEN'),
		// Embedding jobs can use a dedicated gateway without guardrails.
		gatewayId: embeddingGatewayId,
		gatewayAuthToken: getRequiredEnv('CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN'),
		vectorizeIndex: getRequiredEnv('CLOUDFLARE_VECTORIZE_INDEX'),
		embeddingModel:
			process.env.CLOUDFLARE_AI_EMBEDDING_MODEL ??
			'@cf/google/embeddinggemma-300m',
	}
}

async function cfFetch(
	{
		accountId,
		apiToken,
		gatewayId,
		gatewayAuthToken,
	}: {
		accountId: string
		apiToken: string
		gatewayId: string
		gatewayAuthToken: string
	},
	path: string,
	init: RequestInit,
) {
	const workersAiPrefix = '/ai/run/'
	const url = path.startsWith(workersAiPrefix)
		? // Cloudflare expects the model as path segments (with `/`), so do not
			// URL-encode the model string.
			`${getGatewayBaseUrl().replace(/\/+$/, '')}/${accountId}/${gatewayId}/workers-ai/${path.slice(
				workersAiPrefix.length,
			)}`
		: `${getApiBaseUrl()}/accounts/${accountId}${path}`
	const timeoutMs =
		typeof process.env.CLOUDFLARE_API_TIMEOUT_MS === 'string'
			? Number(process.env.CLOUDFLARE_API_TIMEOUT_MS)
			: 90_000

	const maxRetries =
		typeof process.env.CLOUDFLARE_API_MAX_RETRIES === 'string'
			? Number(process.env.CLOUDFLARE_API_MAX_RETRIES)
			: 3

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const timeoutSignal =
			typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
				? (
						AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }
					).timeout(timeoutMs)
				: undefined
		const signal =
			init.signal && timeoutSignal && 'any' in AbortSignal
				? (
						AbortSignal as unknown as {
							any: (signals: AbortSignal[]) => AbortSignal
						}
					).any([init.signal, timeoutSignal])
				: (init.signal ?? timeoutSignal)

		const res = await fetch(url, {
			...init,
			signal,
			headers: {
				Authorization: `Bearer ${apiToken}`,
				...(path.startsWith(workersAiPrefix)
					? { 'cf-aig-authorization': `Bearer ${gatewayAuthToken}` }
					: null),
				...(init.headers ?? {}),
			},
		}).catch((e) => {
			// network/timeout
			if (attempt < maxRetries) return null as any
			throw e
		})

		if (!res) {
			// retry
			await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
			continue
		}

		if (res.status === 429 && attempt < maxRetries) {
			const retryAfter = Number(res.headers.get('Retry-After') ?? '1')
			await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1000))
			continue
		}

		if (!res.ok) {
			const text = await res.text().catch(() => '')
			// Retry transient errors.
			if (res.status >= 500 && attempt < maxRetries) {
				await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
				continue
			}
			throw new Error(
				`Cloudflare API error: ${res.status} ${res.statusText} (${path})${text ? `\n${text}` : ''}`,
			)
		}
		return res
	}

	throw new Error(`Cloudflare API error: exhausted retries (${path})`)
}

export async function getEmbeddings({
	accountId,
	apiToken,
	gatewayId,
	gatewayAuthToken,
	model,
	texts,
}: {
	accountId: string
	apiToken: string
	gatewayId: string
	gatewayAuthToken: string
	model: string
	texts: string[]
}) {
	const res = await cfFetch(
		{ accountId, apiToken, gatewayId, gatewayAuthToken },
		`/ai/run/${model}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: texts }),
		},
	)
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
	gatewayId,
	gatewayAuthToken,
	indexName,
	operation,
	vectors,
}: {
	accountId: string
	apiToken: string
	gatewayId: string
	gatewayAuthToken: string
	indexName: string
	operation: 'insert' | 'upsert'
	vectors: VectorizeVector[]
}) {
	// Cloudflare documents the V2 HTTP API as multipart form upload where the
	// `vectors` field is an NDJSON file.
	// Example: POST /vectorize/v2/indexes/{index}/insert
	const ndjson = vectorsToNdjson(vectors)
	const form = new FormData()
	form.set(
		'vectors',
		new Blob([ndjson], { type: 'application/x-ndjson' }),
		'vectors.ndjson',
	)

	const pathV2 = `/vectorize/v2/indexes/${indexName}/${operation}`
	try {
		const res = await cfFetch(
			{ accountId, apiToken, gatewayId, gatewayAuthToken },
			pathV2,
			{
				method: 'POST',
				body: form,
			},
		)
		return (await res.json()) as any
	} catch (e) {
		// Only fall back when we strongly suspect this is a legacy (v1) index.
		// Falling back for transient errors makes v2 indexes fail with
		// `vectorize.incorrect_api_version`.
		const message = e instanceof Error ? e.message : String(e)
		const looksLikeLegacyIndex =
			/\b404\b/i.test(message) ||
			/not found/i.test(message) ||
			/legacy/i.test(message) ||
			/deprecated-v1/i.test(message)

		if (!looksLikeLegacyIndex) throw e

		const pathLegacy = `/vectorize/indexes/${indexName}/${operation}`
		const res = await cfFetch(
			{ accountId, apiToken, gatewayId, gatewayAuthToken },
			pathLegacy,
			{
				method: 'POST',
				body: form,
			},
		)
		return (await res.json()) as any
	}
}

export async function vectorizeUpsert({
	accountId,
	apiToken,
	gatewayId,
	gatewayAuthToken,
	indexName,
	vectors,
}: {
	accountId: string
	apiToken: string
	gatewayId: string
	gatewayAuthToken: string
	indexName: string
	vectors: VectorizeVector[]
}) {
	return vectorizeWriteNdjson({
		accountId,
		apiToken,
		gatewayId,
		gatewayAuthToken,
		indexName,
		operation: 'upsert',
		vectors,
	})
}

export async function vectorizeDeleteByIds({
	accountId,
	apiToken,
	gatewayId,
	gatewayAuthToken,
	indexName,
	ids,
}: {
	accountId: string
	apiToken: string
	gatewayId: string
	gatewayAuthToken: string
	indexName: string
	ids: string[]
}) {
	const body = JSON.stringify({ ids })
	try {
		const res = await cfFetch(
			{ accountId, apiToken, gatewayId, gatewayAuthToken },
			`/vectorize/v2/indexes/${indexName}/delete_by_ids`,
			{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
		)
		return (await res.json()) as any
	} catch {
		const res = await cfFetch(
			{ accountId, apiToken, gatewayId, gatewayAuthToken },
			`/vectorize/indexes/${indexName}/delete_by_ids`,
			{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
		)
		return (await res.json()) as any
	}
}
