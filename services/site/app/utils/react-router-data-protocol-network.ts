/**
 * Evidence for React Router single-fetch `.data` / `__manifest` network-layer
 * failures when production minification strips RR function names from
 * `Error.stack` (KCD-10N / KCD-XZ / KCD-QG / KCD-10B).
 *
 * Vite mangles `fetchAndDecodeViaTurboStream` / `fetchAndApplyManifestPatches`
 * in client bundles; only request-shape evidence (URL + no HTTP status) is
 * reliable at runtime. Install the fetch tracker early (before hydrate) so
 * hard-reload recovery does not depend on async Sentry init.
 */

export const REACT_ROUTER_DATA_PROTOCOL_REQUEST =
	/\/(?:__manifest|\S+\.data)(?:\?|$)/i

export type FailedDataProtocolNetworkFetch = {
	url: string
	method: string
	at: number
}

export type DataProtocolFetchBreadcrumbLike = {
	category?: string | null
	level?: string | null
	message?: string | null
	data?: {
		url?: string | null
		method?: string | null
		status_code?: number | string | null
	} | null
}

let lastFailedDataProtocolNetworkFetch: FailedDataProtocolNetworkFetch | null =
	null
const fetchFailureTrackerInstalledTargets = new WeakSet<object>()

export function resetFailedDataProtocolNetworkFetchForTests(): void {
	lastFailedDataProtocolNetworkFetch = null
}

export function noteFailedDataProtocolNetworkFetch(
	url: string,
	method: string,
	at: number = Date.now(),
): void {
	if (!REACT_ROUTER_DATA_PROTOCOL_REQUEST.test(url)) return
	lastFailedDataProtocolNetworkFetch = {
		url,
		method: method.trim().toUpperCase() || 'GET',
		at,
	}
}

/**
 * Most recent tracked `.data` / `__manifest` network-layer failure within
 * `maxAgeMs`, or null when none / stale.
 */
export function getRecentFailedDataProtocolNetworkFetch(
	maxAgeMs = 10_000,
	now: number = Date.now(),
): FailedDataProtocolNetworkFetch | null {
	const recent = lastFailedDataProtocolNetworkFetch
	if (recent == null) return null
	if (now - recent.at > maxAgeMs) return null
	return recent
}

function requestUrlFromFetchInput(input: RequestInfo | URL): string {
	if (typeof input === 'string') return input
	if (input instanceof URL) return input.href
	return input.url
}

function requestMethodFromFetchInput(
	input: RequestInfo | URL,
	init?: RequestInit,
): string {
	if (typeof init?.method === 'string' && init.method.trim()) {
		return init.method.trim().toUpperCase()
	}
	if (typeof input !== 'string' && !(input instanceof URL) && input.method) {
		return input.method.trim().toUpperCase() || 'GET'
	}
	return 'GET'
}

/**
 * Wrap `globalThis.fetch` so SPA-nav hard-reload can see `.data` / `__manifest`
 * TypeError failures even when `Error.stack` is minified and Sentry is not yet
 * initialized.
 */
export function installReactRouterDataProtocolFetchFailureTracker(
	target: { fetch: typeof fetch } = globalThis as typeof globalThis & {
		fetch: typeof fetch
	},
): void {
	if (fetchFailureTrackerInstalledTargets.has(target)) return
	if (typeof target.fetch !== 'function') return
	fetchFailureTrackerInstalledTargets.add(target)
	const originalFetch = target.fetch.bind(target)
	target.fetch = async (input, init) => {
		const url = requestUrlFromFetchInput(input)
		const method = requestMethodFromFetchInput(input, init)
		try {
			return await originalFetch(input, init)
		} catch (error) {
			if (
				error instanceof TypeError &&
				REACT_ROUTER_DATA_PROTOCOL_REQUEST.test(url)
			) {
				noteFailedDataProtocolNetworkFetch(url, method)
			}
			throw error
		}
	}
}

function breadcrumbUrl(crumb: DataProtocolFetchBreadcrumbLike): string {
	if (typeof crumb.data?.url === 'string' && crumb.data.url) {
		return crumb.data.url
	}
	if (typeof crumb.message === 'string' && crumb.message) {
		return crumb.message
	}
	return ''
}

function breadcrumbHasHttpStatus(
	crumb: DataProtocolFetchBreadcrumbLike,
): boolean {
	const status = crumb.data?.status_code
	return status != null && status !== ''
}

/**
 * Sentry fetch instrumentation records network-layer failures as `fetch`
 * breadcrumbs at `error` level with a `.data` / `__manifest` URL and no
 * `status_code` (KCD-10N). HTTP error responses still carry a status.
 */
export function isFailedDataProtocolNetworkFetchBreadcrumb(
	crumb: DataProtocolFetchBreadcrumbLike,
): boolean {
	if (crumb.category !== 'fetch' && crumb.category !== 'xhr') return false
	if ((crumb.level ?? '').toLowerCase() !== 'error') return false
	if (breadcrumbHasHttpStatus(crumb)) return false
	return REACT_ROUTER_DATA_PROTOCOL_REQUEST.test(breadcrumbUrl(crumb))
}

export function findFailedDataProtocolNetworkFetchBreadcrumb(
	breadcrumbs: Array<DataProtocolFetchBreadcrumbLike> | null | undefined,
	options: { navigationOnly?: boolean } = {},
): DataProtocolFetchBreadcrumbLike | null {
	const crumbs = breadcrumbs ?? []
	for (let i = crumbs.length - 1; i >= 0; i--) {
		const crumb = crumbs[i]
		if (crumb == null) continue
		if (!isFailedDataProtocolNetworkFetchBreadcrumb(crumb)) continue
		if (options.navigationOnly) {
			const method = (crumb.data?.method ?? 'GET').toString().toUpperCase()
			if (method !== 'GET') continue
		}
		return crumb
	}
	return null
}

/**
 * SPA-nav (loader / manifest) network failure evidence for hard-reload.
 * Excludes non-GET `.data` requests (fetcher actions — KCD-10H / KCD-Y0).
 */
export function hasSpaNavDataProtocolNetworkFailureEvidence(
	breadcrumbs?: Array<DataProtocolFetchBreadcrumbLike> | null,
	now: number = Date.now(),
): boolean {
	if (
		findFailedDataProtocolNetworkFetchBreadcrumb(breadcrumbs, {
			navigationOnly: true,
		}) != null
	) {
		return true
	}
	const recent = getRecentFailedDataProtocolNetworkFetch(10_000, now)
	return recent != null && recent.method === 'GET'
}

/**
 * beforeSend safety-net evidence: any failed `.data` / `__manifest` fetch
 * (SPA nav or fetcher) with no HTTP status.
 */
export function hasClientDataProtocolNetworkFailureEvidence(
	breadcrumbs?: Array<DataProtocolFetchBreadcrumbLike> | null,
	now: number = Date.now(),
): boolean {
	if (findFailedDataProtocolNetworkFetchBreadcrumb(breadcrumbs) != null) {
		return true
	}
	return getRecentFailedDataProtocolNetworkFetch(10_000, now) != null
}
