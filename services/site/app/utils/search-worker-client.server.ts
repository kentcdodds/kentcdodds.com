import type {
	SearchResult,
	SearchWorkerSearchResponse,
} from '#other/search/search-service.ts'
import { getEnv } from '#app/utils/env.server.ts'

const searchWorkerTimeoutMs = 10_000

async function requestSearchWorkerJson({
	path,
	method = 'POST',
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

		let json: SearchWorkerSearchResponse | null = null
		let fallbackText = ''
		try {
			json = (await response.clone().json()) as SearchWorkerSearchResponse
		} catch {
			fallbackText = await response.text().catch(() => '')
		}

		if (!response.ok || json?.ok === false || json === null) {
			throw new Error(
				json?.ok === false
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
}): Promise<Array<SearchResult>> {
	const json = await requestSearchWorkerJson({
		path: '/search',
		body: { query, topK },
	})
	return json.results
}
