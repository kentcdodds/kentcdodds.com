import { http, type HttpHandler } from 'msw'
import { resetSearchWorkerMockState as resetSharedSearchWorkerMockState } from '#app/utils/mock-search-worker-fixtures.server.ts'
import { maybeHandleSearchWorkerMockFetch } from '#app/utils/outbound-mock-search-worker.server.ts'
import { bridgeOutboundMock } from './msw-bridge.ts'

const searchWorkerUrlEnv = process.env.SEARCH_WORKER_URL?.trim()
if (!searchWorkerUrlEnv) {
	throw new Error(
		'SEARCH_WORKER_URL must be set when MSW mocks are enabled (see .env.example).',
	)
}
const searchWorkerBaseUrl = searchWorkerUrlEnv

/** MSW fixture mode when URL contains `mock`; otherwise the canonical handler returns null → passthrough. */
const useSearchWorkerMswMock = searchWorkerBaseUrl
	.toLowerCase()
	.includes('mock')

let searchWorkerMockToken: string | undefined
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

const handleSearchWorkerRequest = bridgeOutboundMock((request) =>
	maybeHandleSearchWorkerMockFetch(request, {
		searchWorkerUrl: searchWorkerBaseUrl,
		searchWorkerToken: searchWorkerMockToken,
	}),
)

export function resetSearchWorkerMockState() {
	if (!useSearchWorkerMswMock) return
	resetSharedSearchWorkerMockState()
}

export const searchWorkerHandlers: Array<HttpHandler> = [
	http.get(searchWorkerUrl('/health'), handleSearchWorkerRequest),
	http.post(searchWorkerUrl('/search'), handleSearchWorkerRequest),
	http.post(searchWorkerUrl('/internal/sync'), handleSearchWorkerRequest),
]
