import type {
	LexicalSearchAdminOverview,
	LexicalSearchChunkRecord,
	LexicalSearchDocDetail,
	LexicalSearchMatch,
	LexicalSearchSourceDetail,
} from '../../../../other/semantic-search/lexical-search-service.ts'
import { getEnv } from '#app/utils/env.server.ts'

type WorkerJsonResponse<T> =
	| ({ ok: true } & T)
	| {
			ok: false
			error: string
	  }

function isMockLexicalWorkerUrl(url: string) {
	return url.startsWith('MOCK_')
}

async function getMockService() {
	return await import('./lexical-search.server.ts')
}

async function requestWorkerJson<T>({
	path,
	method = 'GET',
	body,
}: {
	path: string
	method?: 'GET' | 'POST'
	body?: unknown
}) {
	const env = getEnv()
	const response = await fetch(new URL(path, env.LEXICAL_SEARCH_WORKER_URL), {
		method,
		headers: {
			Authorization: `Bearer ${env.LEXICAL_SEARCH_WORKER_TOKEN}`,
			...(body ? { 'Content-Type': 'application/json' } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	})
	const json = (await response.json()) as WorkerJsonResponse<T>
	if (!response.ok || json.ok === false) {
		throw new Error(
			json.ok === false ? json.error : `Lexical worker request failed (${response.status})`,
		)
	}
	return json
}

export async function queryLexicalSearchMatches({
	query,
	topK,
}: {
	query: string
	topK: number
}) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		await mockService.ensureLexicalSearchReady()
		return mockService.queryLexicalSearch({ query, topK }) as Array<LexicalSearchMatch>
	}

	const json = await requestWorkerJson<{ results: Array<LexicalSearchMatch> }>({
		path: '/query',
		method: 'POST',
		body: { query, topK },
	})
	return json.results
}

export async function getLexicalSearchAdminOverview({
	query,
	sourceKey,
	type,
	limit,
}: {
	query: string
	sourceKey: string
	type: string
	limit: number
}) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		return await mockService.getLexicalSearchAdminOverview({
			query,
			sourceKey,
			type,
			limit,
		})
	}

	const searchParams = new URLSearchParams({
		query,
		sourceKey,
		type,
		limit: String(limit),
	})
	const json = await requestWorkerJson<{ overview: LexicalSearchAdminOverview }>({
		path: `/admin/overview?${searchParams.toString()}`,
	})
	return json.overview
}

export async function getLexicalSearchSourceDetail(sourceKey: string) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		return await mockService.getLexicalSearchSourceDetail(sourceKey)
	}

	const json = await requestWorkerJson<{ detail: LexicalSearchSourceDetail }>({
		path: `/admin/source/${encodeURIComponent(sourceKey)}`,
	})
	return json.detail
}

export async function getLexicalSearchDocDetail(docId: string) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		return await mockService.getLexicalSearchDocDetail(docId)
	}

	const json = await requestWorkerJson<{ detail: LexicalSearchDocDetail }>({
		path: `/admin/doc/${encodeURIComponent(docId)}`,
	})
	return json.detail
}

export async function getLexicalSearchChunkDetail(chunkId: string) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		return await mockService.getLexicalSearchChunkDetail(chunkId)
	}

	const json = await requestWorkerJson<{ detail: LexicalSearchChunkRecord | null }>({
		path: `/admin/chunk/${encodeURIComponent(chunkId)}`,
	})
	return json.detail
}

export async function deleteLexicalSearchSource(sourceKey: string) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		await mockService.deleteLexicalSearchSource(sourceKey)
		return
	}

	await requestWorkerJson({
		path: '/admin/delete',
		method: 'POST',
		body: { kind: 'source', id: sourceKey },
	})
}

export async function deleteLexicalSearchDoc(docId: string) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		await mockService.deleteLexicalSearchDoc(docId)
		return
	}

	await requestWorkerJson({
		path: '/admin/delete',
		method: 'POST',
		body: { kind: 'doc', id: docId },
	})
}

export async function deleteLexicalSearchChunk(chunkId: string) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		await mockService.deleteLexicalSearchChunk(chunkId)
		return
	}

	await requestWorkerJson({
		path: '/admin/delete',
		method: 'POST',
		body: { kind: 'chunk', id: chunkId },
	})
}

export async function syncLexicalSearchService({ force = false }: { force?: boolean } = {}) {
	const env = getEnv()
	if (isMockLexicalWorkerUrl(env.LEXICAL_SEARCH_WORKER_URL)) {
		const mockService = await getMockService()
		return await mockService.syncLexicalSearchArtifactsFromR2({ force })
	}

	return await requestWorkerJson<{ syncedAt: string }>({
		path: '/admin/sync',
		method: 'POST',
		body: { force },
	})
}
