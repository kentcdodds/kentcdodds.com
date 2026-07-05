import { PASSTHROUGH_HOSTS } from './outbound-mock-routes.server.ts'
import {
	maybeHandleOutboundMockFetch,
	type OutboundMockHandlerOptions,
} from './outbound-mock-handler.server.ts'
import { getEnv } from './env.server.ts'

const DEV_SIDECAR_URL =
	process.env.MDX_DEV_SIDECAR_URL ?? 'http://127.0.0.1:3099'

function isLocalRequest(url: URL) {
	return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
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

export function createDevMockFetch({
	mocksEnabled,
	searchWorkerUrl,
	searchWorkerToken,
	onOutboundEmail = captureEmailViaSidecar,
}: {
	mocksEnabled: boolean
	searchWorkerUrl?: string
	searchWorkerToken?: string
	onOutboundEmail?: OutboundMockHandlerOptions['onOutboundEmail']
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

		const mocked = await maybeHandleOutboundMockFetch(request, {
			onOutboundEmail,
			searchWorkerUrl,
			searchWorkerToken,
		})
		if (mocked) return mocked

		return nativeFetch(request)
	}
}

export function installDevMockFetch(options: {
	mocksEnabled: boolean
	searchWorkerUrl?: string
	searchWorkerToken?: string
}) {
	const mockFetch = createDevMockFetch({
		...options,
		searchWorkerToken:
			options.searchWorkerToken ??
			(() => {
				try {
					return getEnv().SEARCH_WORKER_TOKEN
				} catch {
					return undefined
				}
			})(),
	})
	globalThis.fetch = mockFetch as typeof fetch
	return mockFetch
}
