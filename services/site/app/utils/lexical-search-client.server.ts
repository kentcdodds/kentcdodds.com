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

const lexicalSearchWorkerTimeoutMs = 10_000

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
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), lexicalSearchWorkerTimeoutMs)
	try {
		try {
			const response = await fetch(new URL(path, env.LEXICAL_SEARCH_WORKER_URL), {
				method,
				headers: {
					Authorization: `Bearer ${env.LEXICAL_SEARCH_WORKER_TOKEN}`,
					...(body ? { 'Content-Type': 'application/json' } : {}),
				},
				body: body ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			})
			let json: WorkerJsonResponse<T> | null = null
			let fallbackText = ''
			try {
				json = (await response.clone().json()) as WorkerJsonResponse<T>
			} catch {
				try {
					fallbackText = await response.text()
				} catch {
					// Ignore body-read failures; keep the status-based fallback below.
				}
			}
			if (!response.ok || json?.ok === false || json === null) {
				throw new Error(
					json?.ok === false
						? json.error
						: `Lexical worker request failed (${response.status})${fallbackText ? `: ${fallbackText}` : ''}`,
				)
			}
			return json
		} finally {
			clearTimeout(timeoutId)
		}
	} catch (error) {
		clearTimeout(timeoutId)
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(
				`Lexical worker request timed out after ${lexicalSearchWorkerTimeoutMs}ms`,
			)
		}
		throw error
	}
}

export async function queryLexicalSearchMatches({
	query,
	topK,
}: {
	query: string
	topK: number
}) {
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
	const json = await requestWorkerJson<{ detail: LexicalSearchSourceDetail }>({
		path: `/admin/source/${encodeURIComponent(sourceKey)}`,
	})
	return json.detail
}

export async function getLexicalSearchDocDetail(docId: string) {
	const json = await requestWorkerJson<{ detail: LexicalSearchDocDetail }>({
		path: `/admin/doc/${encodeURIComponent(docId)}`,
	})
	return json.detail
}

export async function getLexicalSearchChunkDetail(chunkId: string) {
	const json = await requestWorkerJson<{ detail: LexicalSearchChunkRecord | null }>({
		path: `/admin/chunk/${encodeURIComponent(chunkId)}`,
	})
	return json.detail
}

export async function deleteLexicalSearchSource(sourceKey: string) {
	await requestWorkerJson({
		path: '/admin/delete',
		method: 'POST',
		body: { kind: 'source', id: sourceKey },
	})
}

export async function deleteLexicalSearchDoc(docId: string) {
	await requestWorkerJson({
		path: '/admin/delete',
		method: 'POST',
		body: { kind: 'doc', id: docId },
	})
}

export async function deleteLexicalSearchChunk(chunkId: string) {
	await requestWorkerJson({
		path: '/admin/delete',
		method: 'POST',
		body: { kind: 'chunk', id: chunkId },
	})
}

export async function syncLexicalSearchService({ force = false }: { force?: boolean } = {}) {
	return await requestWorkerJson<{ syncedAt: string }>({
		path: '/admin/sync',
		method: 'POST',
		body: { force },
	})
}
