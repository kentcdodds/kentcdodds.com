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

/** Single-fetch loader/action URLs — hard-reload signal (not fog-of-war). */
export const REACT_ROUTER_SINGLE_FETCH_DATA_REQUEST = /\.data(?:\?|$)/i

export const DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS = 10_000

export type FailedDataProtocolNetworkFetch = {
	url: string
	method: string
	at: number
}

export type DataProtocolFetchBreadcrumbLike = {
	category?: string | null
	level?: string | null
	message?: string | null
	/** Sentry breadcrumb time in seconds (unix). */
	timestamp?: number | null
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
	maxAgeMs = DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS,
	now: number = Date.now(),
): FailedDataProtocolNetworkFetch | null {
	const recent = lastFailedDataProtocolNetworkFetch
	if (recent == null) return null
	if (now - recent.at > maxAgeMs) return null
	return recent
}

/**
 * Read + clear a recent tracker note so a stale `.data` failure cannot classify
 * a later unrelated network TypeError (Devin review on KCD-10N).
 */
export function consumeRecentFailedDataProtocolNetworkFetch(
	maxAgeMs = DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS,
	now: number = Date.now(),
): FailedDataProtocolNetworkFetch | null {
	const recent = getRecentFailedDataProtocolNetworkFetch(maxAgeMs, now)
	if (recent == null) return null
	lastFailedDataProtocolNetworkFetch = null
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

function isErrorFetchBreadcrumb(
	crumb: DataProtocolFetchBreadcrumbLike,
): boolean {
	if (crumb.category !== 'fetch' && crumb.category !== 'xhr') return false
	return (crumb.level ?? '').toLowerCase() === 'error'
}

function isBreadcrumbFresh(
	crumb: DataProtocolFetchBreadcrumbLike,
	now: number,
	maxAgeMs: number,
): boolean {
	if (typeof crumb.timestamp !== 'number') {
		// Missing timestamp: allow only when this is the most recent error fetch
		// (caller already enforces that). Age is unknown — prefer matching KCD-10N
		// events that omit timestamps over silently dropping them.
		return true
	}
	// Sentry stores breadcrumb timestamps in seconds.
	return now - crumb.timestamp * 1000 <= maxAgeMs
}

/**
 * Sentry fetch instrumentation records network-layer failures as `fetch`
 * breadcrumbs at `error` level with a `.data` / `__manifest` URL and no
 * `status_code` (KCD-10N). HTTP error responses still carry a status.
 */
export function isFailedDataProtocolNetworkFetchBreadcrumb(
	crumb: DataProtocolFetchBreadcrumbLike,
): boolean {
	if (!isErrorFetchBreadcrumb(crumb)) return false
	if (breadcrumbHasHttpStatus(crumb)) return false
	return REACT_ROUTER_DATA_PROTOCOL_REQUEST.test(breadcrumbUrl(crumb))
}

function isSpaNavHardReloadDataRequest(url: string, method: string): boolean {
	// Hard-reload is only for single-fetch `.data` GETs. Fog-of-war `__manifest`
	// GETs also fail during fetcher submissions (KCD-10H) — reloading the
	// document there is wrong when stacks are minified.
	if (method !== 'GET') return false
	return REACT_ROUTER_SINGLE_FETCH_DATA_REQUEST.test(url)
}

/**
 * Only the most recent error-level fetch/xhr breadcrumb can establish
 * data-protocol evidence. Older `.data` failures must not classify a later
 * unrelated `Failed to fetch` (CodeRabbit / Devin on KCD-10N).
 */
export function findFailedDataProtocolNetworkFetchBreadcrumb(
	breadcrumbs: Array<DataProtocolFetchBreadcrumbLike> | null | undefined,
	options: {
		navigationOnly?: boolean
		now?: number
		maxAgeMs?: number
	} = {},
): DataProtocolFetchBreadcrumbLike | null {
	const crumbs = breadcrumbs ?? []
	const now = options.now ?? Date.now()
	const maxAgeMs = options.maxAgeMs ?? DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS

	for (let i = crumbs.length - 1; i >= 0; i--) {
		const crumb = crumbs[i]
		if (crumb == null) continue
		if (!isErrorFetchBreadcrumb(crumb)) continue
		if (!isBreadcrumbFresh(crumb, now, maxAgeMs)) return null
		if (!isFailedDataProtocolNetworkFetchBreadcrumb(crumb)) return null
		if (options.navigationOnly) {
			const method = (crumb.data?.method ?? 'GET').toString().toUpperCase()
			const url = breadcrumbUrl(crumb)
			if (!isSpaNavHardReloadDataRequest(url, method)) return null
		}
		return crumb
	}
	return null
}

/**
 * SPA-nav hard-reload evidence: recent GET `.data` network failure only.
 * Excludes `__manifest` (fetcher fog-of-war before actions — KCD-10H) and
 * non-GET `.data` (fetcher actions — KCD-Y0). Does not consume the tracker
 * note — `isReactRouterSpaNavNetworkError` may run several times per render
 * (reconnecting UI + hard-reload + skip-capture); callers that commit to a
 * reload should call `consumeRecentFailedDataProtocolNetworkFetch`.
 */
export function hasSpaNavDataProtocolNetworkFailureEvidence(
	breadcrumbs?: Array<DataProtocolFetchBreadcrumbLike> | null,
	now: number = Date.now(),
): boolean {
	if (
		findFailedDataProtocolNetworkFetchBreadcrumb(breadcrumbs, {
			navigationOnly: true,
			now,
		}) != null
	) {
		return true
	}
	const recent = getRecentFailedDataProtocolNetworkFetch(
		DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS,
		now,
	)
	return (
		recent != null && isSpaNavHardReloadDataRequest(recent.url, recent.method)
	)
}

/**
 * beforeSend safety-net evidence: most recent error fetch is a failed
 * `.data` / `__manifest` request (SPA nav or fetcher) with no HTTP status,
 * within the same recency window as the tracker.
 */
export function hasClientDataProtocolNetworkFailureEvidence(
	breadcrumbs?: Array<DataProtocolFetchBreadcrumbLike> | null,
	now: number = Date.now(),
): boolean {
	if (
		findFailedDataProtocolNetworkFetchBreadcrumb(breadcrumbs, { now }) != null
	) {
		return true
	}
	return (
		getRecentFailedDataProtocolNetworkFetch(
			DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS,
			now,
		) != null
	)
}
