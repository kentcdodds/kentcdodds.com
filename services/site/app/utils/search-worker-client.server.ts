import type {
	SearchWorkerHealthResponse,
	SearchResult,
	SearchWorkerSearchResponse,
} from '@kcd-internal/search-shared'
import { getEnv } from '#app/utils/env.server.ts'

const searchWorkerTimeoutMs = 10_000

async function requestSearchWorkerJson<T extends { ok: boolean }>({
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
	const timeoutId = setTimeout(() => controller.abort(), searchWorkerTimeoutMs)

	try {
		const response = await fetch(new URL(path, env.SEARCH_WORKER_URL), {
			method,
			headers: {
				Authorization: `Bearer ${env.SEARCH_WORKER_TOKEN}`,
				...(body ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
			signal: controller.signal,
		})

		let json: T | null = null
		let fallbackText = ''
		try {
			json = (await response.clone().json()) as T
		} catch {
			fallbackText = await response.text().catch(() => '')
		}

		if (!response.ok || json?.ok === false || json === null) {
			throw new Error(
				json?.ok === false && 'error' in json && typeof json.error === 'string'
					? json.error
					: `Search worker request failed (${response.status})${fallbackText ? `: ${fallbackText}` : ''}`,
			)
		}

		return json
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(
				`Search worker request timed out after ${searchWorkerTimeoutMs}ms`,
			)
		}
		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}

export async function querySearchWorkerResults({
	query,
	topK,
}: {
	query: string
	topK: number
}): Promise<{
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
}> {
	const json = await requestSearchWorkerJson<SearchWorkerSearchResponse>({
		path: '/search',
		method: 'POST',
		body: { query, topK },
	})
	if (!('results' in json) || !Array.isArray(json.results)) {
		throw new Error('Search worker returned an invalid results payload')
	}
	return {
		results: json.results,
		lowRankingResults: Array.isArray(json.lowRankingResults)
			? json.lowRankingResults
			: [],
		noCloseMatches: Boolean(json.noCloseMatches),
	}
}

export async function getSearchWorkerHealth() {
	return await requestSearchWorkerJson<SearchWorkerHealthResponse>({
		path: '/health',
	})
}
