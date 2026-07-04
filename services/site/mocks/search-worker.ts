import { http, HttpResponse, passthrough, type HttpHandler } from 'msw'
import {
	buildSearchWorkerMockResults,
	getSearchWorkerMockSyncedAt,
	resetSearchWorkerMockState as resetSharedSearchWorkerMockState,
} from '#app/utils/mock-search-worker-fixtures.server.ts'

const searchWorkerUrlEnv = process.env.SEARCH_WORKER_URL?.trim()
if (!searchWorkerUrlEnv) {
	throw new Error(
		'SEARCH_WORKER_URL must be set when MSW mocks are enabled (see .env.example).',
	)
}
const searchWorkerBaseUrl = searchWorkerUrlEnv

/** MSW fixture mode when URL contains `mock`; otherwise handlers call `passthrough()` first. */
const useSearchWorkerMswMock = searchWorkerBaseUrl
	.toLowerCase()
	.includes('mock')

let searchWorkerMockToken = ''
if (useSearchWorkerMswMock) {
	const tokenEnv = process.env.SEARCH_WORKER_TOKEN?.trim()
	if (!tokenEnv) {
		throw new Error(
			'SEARCH_WORKER_TOKEN must be set when SEARCH_WORKER_URL is a mock worker URL (see .env.example).',
		)
	}
	searchWorkerMockToken = tokenEnv
}

function searchWorkerUrl(path: string) {
	return new URL(path, searchWorkerBaseUrl).href
}

export function resetSearchWorkerMockState() {
	if (!useSearchWorkerMswMock) return
	resetSharedSearchWorkerMockState()
}

function isAuthorized(request: Request) {
	return (
		request.headers.get('Authorization') === `Bearer ${searchWorkerMockToken}`
	)
}

export const searchWorkerHandlers: Array<HttpHandler> = [
	http.get(searchWorkerUrl('/health'), () => {
		if (!useSearchWorkerMswMock) return passthrough()
		return HttpResponse.json({
			ok: true,
			syncedAt: getSearchWorkerMockSyncedAt(),
		})
	}),
	http.post(searchWorkerUrl('/search'), async ({ request }) => {
		if (!useSearchWorkerMswMock) return passthrough()
		if (!isAuthorized(request)) {
			return HttpResponse.json(
				{ ok: false, error: 'Unauthorized' },
				{ status: 401 },
			)
		}

		const body = (await request.json()) as { query?: string; topK?: number }
		const results = buildSearchWorkerMockResults({
			query: body.query ?? '',
			topK: typeof body.topK === 'number' ? body.topK : 10,
		})
		return HttpResponse.json({
			ok: true,
			results,
			lowRankingResults: [],
			noCloseMatches: false,
		})
	}),
	http.post(searchWorkerUrl('/internal/sync'), async ({ request }) => {
		if (!useSearchWorkerMswMock) return passthrough()
		if (!isAuthorized(request)) {
			return HttpResponse.json(
				{ ok: false, error: 'Unauthorized' },
				{ status: 401 },
			)
		}

		resetSharedSearchWorkerMockState()
		return HttpResponse.json({
			ok: true,
			syncedAt: getSearchWorkerMockSyncedAt(),
		})
	}),
]
