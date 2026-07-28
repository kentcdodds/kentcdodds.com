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
	// Instagram / iOS in-app browser WKWebView bridge (KCD-ZR / KCD-ZC).
	// Stack functions are sendDataToNative / sendPageHideMessage /
	// setupIosCallbackHandler — not present in app code.
	/window\.webkit\.messageHandlers/,
	// javascript-obfuscator-style injected scripts (KCD-ZG).
	/a0_0x[0-9a-f]+ is not defined/,
	// WKWebView native bridge rejecting script into a missing frame (KCD-YV).
	/WKErrorDomain Code=12/,
	// Sentry Session Replay probing cross-origin iframes (KCD-TF).
	/Failed to read a named property 'Element' from 'Window': Blocked a frame/,
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

type SentryBreadcrumbLike = {
	category?: string | null
	message?: string | null
}

type SentryEventLike = {
	message?: string | null
	request?: { url?: string | null } | null
	exception?: { values?: Array<SentryExceptionValue> | null } | null
	extra?: { route_error_response?: RouteErrorResponseExtra | null } | null
	breadcrumbs?: Array<SentryBreadcrumbLike> | null
}

// Google Translate / browser page-translate wraps text in nested <font> tags.
const TRANSLATOR_FONT_SELECTOR = /(?:^|>)\s*font\s*>\s*font\b/i
const CALL_STACK_OVERFLOW = /Maximum call stack size exceeded/i

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

const STACK_SCRIPT_URL =
	/\b(?:blob:|https?:\/\/|webkit-masked-url:|chrome-extension:|moz-extension:|safari-web-extension:|safari-extension:|iabjs:)[^\s)]+/gi

function scriptUrlsFromStackBlob(stack: string): Array<string> {
	return [...stack.matchAll(STACK_SCRIPT_URL)].map((match) => match[0] ?? '')
}

/**
 * Extensions often inject executable blob: scripts. App createObjectURL usage
 * is audio-only and never appears as JS stack frames, so a TypeError reading
 * addListener with an exclusively-blob stack is external (KCD-Z7).
 */
export function isInjectedBlobAddListenerError(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const looksLikeAddListener = eventMessages(event).some((message) =>
		/reading ['"]addListener['"]/.test(message),
	)
	if (!looksLikeAddListener) return false

	const frames = (event.exception?.values ?? []).flatMap(
		(value) => value.stacktrace?.frames ?? [],
	)
	const filenames = frames
		.map((frame) => frame.filename ?? '')
		.filter(Boolean)
	if (filenames.length > 0) {
		return filenames.every((filename) => /^blob:/i.test(filename))
	}

	// No Sentry frame filenames — parse URLs out of Error.stack (stackBlob
	// prefixes a newline, so ^blob: on the whole string would never match).
	const urls = scriptUrlsFromStackBlob(stackBlob(event, hint.originalException))
	return urls.length > 0 && urls.every((url) => /^blob:/i.test(url))
}

function isCallStackOverflow(event: SentryEventLike): boolean {
	return eventMessages(event).some((message) => CALL_STACK_OVERFLOW.test(message))
}

function exceptionFrames(event: SentryEventLike) {
	return (event.exception?.values ?? []).flatMap(
		(value) => value.stacktrace?.frames ?? [],
	)
}

/**
 * Real app recursion still attributes frames to bundle URLs. Translator and
 * other injected scripts often report a single unusable "undefined" filename
 * via window.onerror (KCD-QW).
 */
export function hasOnlyUnusableStackFrames(event: SentryEventLike): boolean {
	const frames = exceptionFrames(event)
	if (frames.length === 0) return true
	return frames.every((frame) => {
		const filename = frame.filename
		return (
			filename == null ||
			filename === '' ||
			filename === 'undefined' ||
			filename === 'null'
		)
	})
}

function hasTranslatorFontBreadcrumb(event: SentryEventLike): boolean {
	return (event.breadcrumbs ?? []).some(
		(breadcrumb) =>
			breadcrumb.category === 'ui.click' &&
			TRANSLATOR_FONT_SELECTOR.test(breadcrumb.message ?? ''),
	)
}

/** Live marker Google/Chrome page translate adds to <html>. */
export function isHtmlPageTranslated(
	doc: { documentElement?: { className?: string } | null } | null | undefined =
		typeof document === 'undefined' ? undefined : document,
): boolean {
	const className = doc?.documentElement?.className
	if (typeof className !== 'string') return false
	return /\btranslated-(?:ltr|rtl)\b/.test(className)
}

/**
 * Page translators (Google Translate / Chrome Translate) mutate React's DOM
 * with nested <font> tags and can recurse until RangeError. Only drop when the
 * stack is unattributed and translator evidence is present (KCD-QW).
 */
export function isPageTranslatorCallStackOverflow(
	event: SentryEventLike,
	options: { pageTranslated?: boolean } = {},
): boolean {
	if (!isCallStackOverflow(event)) return false
	if (!hasOnlyUnusableStackFrames(event)) return false
	if (hasTranslatorFontBreadcrumb(event)) return true
	if (options.pageTranslated === true) return true
	if (options.pageTranslated === false) return false
	return isHtmlPageTranslated()
}

export function shouldDropSentryEvent(
	event: SentryEventLike,
	hint: { originalException?: unknown; pageTranslated?: boolean } = {},
): boolean {
	if (isBrowserExtensionError(hint.originalException)) return true
	if (isWalletUserRejection(event, hint)) return true
	if (isInjectedBlobAddListenerError(event, hint)) return true
	if (isDegradedUiPerformanceEvent(event)) return true
	if (isCloudflareEdgeRouteErrorEvent(event)) return true
	if (isReactRouterEdgeHttpStatusError(event, hint)) return true
	if (event.request?.url?.includes('/lookout')) return true
	if (event.request?.url?.includes('translate-pa.googleapis.com')) return true
	if (
		isPageTranslatorCallStackOverflow(event, {
			pageTranslated: hint.pageTranslated,
		})
	) {
		return true
	}
	return false
}
