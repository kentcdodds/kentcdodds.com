import {
	buildSearchWorkerMockResults,
	getSearchWorkerMockSyncedAt,
	resetSearchWorkerMockState,
} from './mock-search-worker-fixtures.server.ts'

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

function parseHostname(url: string | undefined) {
	if (!url) return null
	try {
		return new URL(url).hostname
	} catch {
		return null
	}
}

export function isSearchWorkerMockHost(
	hostname: string,
	searchWorkerUrl?: string,
) {
	const configuredHost = parseHostname(searchWorkerUrl)
	if (configuredHost && hostname === configuredHost) {
		return searchWorkerUrl?.toLowerCase().includes('mock') ?? false
	}
	return hostname.includes('mock.search-worker')
}

function isAuthorized(request: Request, searchWorkerToken?: string) {
	if (!searchWorkerToken) return false
	return request.headers.get('Authorization') === `Bearer ${searchWorkerToken}`
}

export async function maybeHandleSearchWorkerMockFetch(
	request: Request,
	{
		searchWorkerUrl,
		searchWorkerToken,
	}: {
		searchWorkerUrl?: string
		searchWorkerToken?: string
	} = {},
) {
	const url = new URL(request.url)
	if (!isSearchWorkerMockHost(url.hostname, searchWorkerUrl)) {
		return null
	}

	if (request.method === 'GET' && url.pathname === '/health') {
		return json({
			ok: true,
			syncedAt: getSearchWorkerMockSyncedAt(),
		})
	}

	if (request.method === 'POST' && url.pathname === '/search') {
		if (!isAuthorized(request, searchWorkerToken)) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}

		const body = (await request.json()) as { query?: string; topK?: number }
		const results = buildSearchWorkerMockResults({
			query: body.query ?? '',
			topK: typeof body.topK === 'number' ? body.topK : 10,
		})
		return json({
			ok: true,
			results,
			lowRankingResults: [],
			noCloseMatches: false,
		})
	}

	if (request.method === 'POST' && url.pathname === '/internal/sync') {
		if (!isAuthorized(request, searchWorkerToken)) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}

		resetSearchWorkerMockState()
		return json({
			ok: true,
			syncedAt: getSearchWorkerMockSyncedAt(),
		})
	}

	return null
}
