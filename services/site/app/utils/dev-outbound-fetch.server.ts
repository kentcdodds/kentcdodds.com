import {
	findOutboundMockRoute,
	PASSTHROUGH_HOSTS,
} from './outbound-mock-routes.server.ts'
import {
	maybeHandleOutboundMockFetch,
	type OutboundMockHandlerOptions,
} from './outbound-mock-handler.server.ts'

const DEV_SIDECAR_URL =
	process.env.MDX_DEV_SIDECAR_URL ?? 'http://127.0.0.1:3099'

function parseHostname(url: string | undefined) {
	if (!url) return null
	try {
		return new URL(url).hostname
	} catch {
		return null
	}
}

function isLocalRequest(url: URL) {
	return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
}

function isSearchWorkerMockHost(hostname: string, searchWorkerUrl?: string) {
	const configuredHost = parseHostname(searchWorkerUrl)
	if (configuredHost && hostname === configuredHost) {
		return searchWorkerUrl?.toLowerCase().includes('mock') ?? false
	}
	return hostname.includes('mock.search-worker')
}

async function captureEmailViaSidecar(body: Record<string, string>) {
	console.info('🔶 mocked email contents:', body)
	try {
		await fetch(`${DEV_SIDECAR_URL}/__dev/capture-email`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
	} catch (error: unknown) {
		console.warn(
			'Failed to persist mocked email via dev sidecar; check dev worker logs for verification links.',
			error,
		)
	}
}

async function handleSearchWorkerMock(request: Request) {
	const url = new URL(request.url)
	if (request.method === 'GET' && url.pathname === '/health') {
		return Response.json({ ok: true })
	}
	if (request.method === 'POST' && url.pathname === '/search') {
		return Response.json({
			ok: true,
			results: [],
			lowRankingResults: [],
			noCloseMatches: true,
		})
	}
	return new Response('Not Found', { status: 404 })
}

export function createDevMockFetch({
	mocksEnabled,
	searchWorkerUrl,
	onMailgunEmail = captureEmailViaSidecar,
}: {
	mocksEnabled: boolean
	searchWorkerUrl?: string
	onMailgunEmail?: OutboundMockHandlerOptions['onMailgunEmail']
}) {
	const nativeFetch = globalThis.fetch.bind(globalThis)

	return async function devMockFetch(
		input: RequestInfo | URL,
		init?: RequestInit,
	) {
		const request = new Request(input, init)
		const url = new URL(request.url)

		if (!mocksEnabled) {
			return nativeFetch(request)
		}

		if (isLocalRequest(url)) {
			return nativeFetch(request)
		}

		if (PASSTHROUGH_HOSTS.has(url.hostname)) {
			return nativeFetch(request)
		}

		if (isSearchWorkerMockHost(url.hostname, searchWorkerUrl)) {
			return handleSearchWorkerMock(request)
		}

		if (findOutboundMockRoute(request, url)) {
			const mocked = await maybeHandleOutboundMockFetch(request, {
				onMailgunEmail,
			})
			if (mocked) return mocked
		}

		return nativeFetch(request)
	}
}

export function installDevMockFetch(options: {
	mocksEnabled: boolean
	searchWorkerUrl?: string
}) {
	const mockFetch = createDevMockFetch(options)
	globalThis.fetch = mockFetch as typeof fetch
	return mockFetch
}
