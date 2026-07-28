/**
 * Narrow client-side Sentry noise filters for injected third-party scripts,
 * browser extensions, in-app browsers, and similar non-app sources.
 *
 * Prefer message/URL signatures over broad network-error filters so real
 * outages still alert. Drop rules must establish an external source via a
 * distinctive payload signature, extension/IAB URL, or provider error code —
 * not a generic phrase alone.
 */

export const SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
	// Tunnel / self-reporting
	'Request to /lookout failed',
	// Broken local/dev CONFIG injection
	"Can't find variable: CONFIG",
	'CONFIG is not defined',
	// Injected/third-party module loaders (seen from chatgpt.com referrers).
	/Module load timeout: m_\d+/,
	// Microsoft Outlook SafeLinks / Office link-preview crawler (KCD-1K).
	/Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/,
	// Firefox for iOS content-script bridge (KCD-RB).
	/Can't find variable: __firefox__/,
	/__firefox__ is not defined/,
	// WebExtension messaging API leaking into the page (KCD-JC).
	/Invalid call to runtime\.sendMessage\(\)\. Tab not found/,
	// Injected extension post bridge (KCD-W9).
	/Error invoking post: Method not found/,
	// Android in-app browser (Instagram/etc.) native bridge (KCD-ZM).
	/Error invoking postMessage: Java object is gone/,
	// Injected social/OG scrapers reading meta tags that aren't present (KCD-2K family).
	/document\.querySelector\("meta\[property='og:type'\]"\)\.content/,
	// Injected HTML parsers / translators mutating the DOM (KCD-ZZ).
	/evaluating 'elem\.firstChild'/,
]

export const SENTRY_DENY_URLS: Array<RegExp> = [
	/chrome-extension:\/\//i,
	/moz-extension:\/\//i,
	/safari-web-extension:\/\//i,
	/safari-extension:\/\//i,
	/webkit-masked-url:\/\//i,
	// Android in-app browser injected scripts (Instagram, etc.).
	/iabjs:/i,
]

type SentryExceptionValue = {
	type?: string | null
	value?: string | null
	stacktrace?: {
		frames?: Array<{
			filename?: string | null
			function?: string | null
		}> | null
	} | null
}

type RouteErrorResponseExtra = {
	status?: number | null
	statusText?: string | null
	data?: unknown
}

type SentryEventLike = {
	message?: string | null
	request?: { url?: string | null } | null
	exception?: { values?: Array<SentryExceptionValue> | null } | null
	extra?: { route_error_response?: RouteErrorResponseExtra | null } | null
}

const WALLET_PROVIDER_STACK =
	/metamask|coinbase|rainbow|walletconnect|phantom|ethereum|eip-1193|inpage\.js|nkbihfbeogaeaoehlefnkodbefgpgknn/i

/** Cloudflare edge HTML error pages (502/503/524) seen on SPA .data fetches. */
const CLOUDFLARE_EDGE_ERROR_TITLE =
	/<\s*title[^>]*>[^<]*\|\s*5(?:02:\s*Bad gateway|03:\s*Service unavailable|24:\s*A timeout occurred)\s*<\s*\/\s*title\s*>/i

const CLOUDFLARE_EDGE_STATUSES = new Set([502, 503, 524])

const REACT_ROUTER_EDGE_HTTP_STATUS_MESSAGE = /^5(?:02|03|24)\s*$/

const REACT_ROUTER_MANIFEST_PATCH_STACK = /fetchAndApplyManifestPatches/

export function isBrowserExtensionError(exception: unknown): boolean {
	if (!(exception instanceof Error) || !exception.stack) return false
	return /chrome-extension:|moz-extension:|safari-web-extension:|safari-extension:|webkit-masked-url:|iabjs:/i.test(
		exception.stack,
	)
}

export function isDegradedUiPerformanceEvent(event: SentryEventLike): boolean {
	if (event.message === 'Degraded UI Performance') return true
	return (event.exception?.values ?? []).some(
		(value) => value.type === 'Degraded UI Performance',
	)
}

function eventMessages(event: SentryEventLike): Array<string> {
	const messages = (event.exception?.values ?? [])
		.map((value) => value.value ?? '')
		.filter(Boolean)
	if (event.message) messages.push(event.message)
	return messages
}

function hasStackFrames(event: SentryEventLike): boolean {
	return (event.exception?.values ?? []).some(
		(value) => (value.stacktrace?.frames?.length ?? 0) > 0,
	)
}

function stackBlob(event: SentryEventLike, originalException: unknown): string {
	const frameFiles = (event.exception?.values ?? [])
		.flatMap((value) => value.stacktrace?.frames ?? [])
		.map((frame) => frame.filename ?? '')
		.join('\n')
	const errorStack =
		originalException instanceof Error ? (originalException.stack ?? '') : ''
	return `${frameFiles}\n${errorStack}`
}

export function isCloudflareEdgeErrorHtml(data: string): boolean {
	if (!CLOUDFLARE_EDGE_ERROR_TITLE.test(data)) return false
	// Ray ID + "cloudflare" are stable markers on the generic edge HTML page.
	return /Ray ID/i.test(data) || /cloudflare/i.test(data)
}

/**
 * Client RouteErrorResponse for edge/origin 502/503/524 — not an app throw.
 * Confirmed via Sentry `extra.route_error_response.data` (Cloudflare HTML) or
 * bare empty-body statuses during SPA data/manifest fetches (KCD-VH family).
 * App 502/503 responses carry a non-empty body (lookout string / search JSON).
 */
export function isCloudflareEdgeRouteError(error: {
	status: number
	statusText?: string | null
	data?: unknown
}): boolean {
	if (!CLOUDFLARE_EDGE_STATUSES.has(error.status)) return false

	if (typeof error.data === 'string' && isCloudflareEdgeErrorHtml(error.data)) {
		return true
	}

	const statusText = error.statusText ?? ''
	const emptyBody = error.data === '' || error.data == null
	return statusText === '' && emptyBody
}

function routeErrorExtra(
	event: SentryEventLike,
): RouteErrorResponseExtra | null {
	return event.extra?.route_error_response ?? null
}

export function isCloudflareEdgeRouteErrorEvent(event: SentryEventLike): boolean {
	const route = routeErrorExtra(event)
	if (!route || typeof route.status !== 'number') return false

	return isCloudflareEdgeRouteError({
		status: route.status,
		statusText: route.statusText,
		data: route.data,
	})
}

/**
 * React Router surfaces bare `Error: 502 ` / `503 ` / `524 ` from
 * fetchAndApplyManifestPatches when `__manifest` hits an edge HTTP failure
 * (KCD-ZH / KCD-YD / KCD-YF). Require the RR frame — never the status alone.
 */
export function isReactRouterEdgeHttpStatusError(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const messages = eventMessages(event)
	const original = hint.originalException
	if (original instanceof Error) messages.push(original.message)

	if (!messages.some((message) => REACT_ROUTER_EDGE_HTTP_STATUS_MESSAGE.test(message))) {
		return false
	}

	return REACT_ROUTER_MANIFEST_PATCH_STACK.test(stackBlob(event, original))
}

/**
 * EIP-1193 wallet extensions reject with code 4001 / "user rejected the
 * request". Only drop when that provider signal is present — never on the
 * phrase alone.
 */
export function isWalletUserRejection(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const original = hint.originalException
	if (original && typeof original === 'object' && 'code' in original) {
		const code = (original as { code?: unknown }).code
		if (code === 4001 || code === '4001') return true
	}

	const looksLikeUserRejection = eventMessages(event).some((message) =>
		/user rejected the request/i.test(message),
	)
	if (!looksLikeUserRejection) return false

	// Non-Error wallet rejections often have zero frames; require a provider
	// marker whenever any stack evidence exists.
	if (hasStackFrames(event) || original instanceof Error) {
		return WALLET_PROVIDER_STACK.test(stackBlob(event, original))
	}

	return (event.exception?.values ?? []).some(
		(value) =>
			value.type === 'UnhandledRejection' ||
			/Non-Error promise rejection/i.test(value.value ?? ''),
	)
}

export function shouldDropSentryEvent(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	if (isBrowserExtensionError(hint.originalException)) return true
	if (isWalletUserRejection(event, hint)) return true
	if (isDegradedUiPerformanceEvent(event)) return true
	if (isCloudflareEdgeRouteErrorEvent(event)) return true
	if (isReactRouterEdgeHttpStatusError(event, hint)) return true
	if (event.request?.url?.includes('/lookout')) return true
	if (event.request?.url?.includes('translate-pa.googleapis.com')) return true
	return false
}
