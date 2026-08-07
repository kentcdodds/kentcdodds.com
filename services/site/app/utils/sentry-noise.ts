/**
 * Narrow Sentry noise filters for injected third-party scripts, browser
 * extensions, in-app browsers, and expected framework security rejects.
 *
 * Prefer message/URL signatures over broad network-error filters so real
 * outages still alert. Drop rules must establish an external source via a
 * distinctive payload signature, extension/IAB URL, provider error code, or
 * framework CSRF-abort text — not a generic phrase alone.
 *
 * Client SDK: wired from `monitoring.client.tsx` via `ignoreErrors` /
 * `denyUrls` / `shouldDropSentryEvent`. Server: `isReactRouterCsrfAbortError`
 * is wired from `entry.server.tsx` `handleError` (KCD-YN).
 */

/**
 * React Router `throwIfPotentialCSRFAttack` rejects cross-origin POSTs with
 * these exact messages, then `handleError` would otherwise report them.
 * That is expected security behavior (attacker probes / mismatched Origin),
 * not an app bug — skip Sentry capture.
 */
const REACT_ROUTER_CSRF_ABORT_MESSAGES = [
	'header does not match `origin` header from a forwarded action request. Aborting the action.',
	'`origin` header is not a valid URL. Aborting the action.',
	'`x-forwarded-host` or `host` headers are not provided. One of these is needed to compare the `origin` header from a forwarded action request. Aborting the action.',
] as const

export function isReactRouterCsrfAbortError(error: unknown): boolean {
	if (!(error instanceof Error)) return false
	return REACT_ROUTER_CSRF_ABORT_MESSAGES.some((message) =>
		error.message.includes(message),
	)
}

const TURBO_STREAM_DECODE_ERROR = 'Unable to decode turbo-stream response'
const HTML_AS_JSON_ERROR = /Unexpected token '<',\s*"<!DOCTYPE/i
const SAFARI_JSON_PATTERN_ERROR =
	/^The string did not match the expected pattern\.?$/i
/**
 * Firefox reports C1/control codepoints this way when an HTML document is
 * parsed as a script (KCD-105). Chrome's sibling is HTML_AS_JSON_ERROR.
 */
const FIREFOX_ILLEGAL_CHARACTER_SYNTAX = /^illegal character U\+[0-9A-Fa-f]+$/i
const HTML_DOCTYPE_SOURCE_LINE = /^\s*<!DOCTYPE\b/i
/** Real script/module/asset filenames — never treat these as HTML documents. */
const SCRIPT_OR_ASSET_FILENAME =
	/\.(?:m?[jt]sx?|cjs|css|json|map|wasm)(?:\?|#|$)/i
const REACT_ROUTER_TURBO_STREAM_STACK = /fetchAndDecodeViaTurboStream/
const REACT_ROUTER_DATA_PROTOCOL_MANIFEST_STACK =
	/fetchAndApplyManifestPatches|Failed to fetch manifest patches/i
const DATA_PROTOCOL_REQUEST = /\/(?:__manifest|\S+\.data)(?:\?|$)/i

/** Safari / extension CustomEvent wrapping unhandledrejection (KCD-S8). */
const CUSTOM_EVENT_UNHANDLED_REJECTION_MESSAGE =
	/Event `CustomEvent` \(type=unhandledrejection\) captured as promise rejection/i

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
	// Check Point Zero Phishing injected zp.js (KCD-102). Distinctive
	// undefined token from zerophishing.iaas.checkpoint.com — not app code.
	/Can't find variable: zp_token/,
	/zp_token is not defined/,
	// WKWebView native bridge rejecting script into a missing frame (KCD-YV).
	/WKErrorDomain Code=12/,
	// Sentry Session Replay probing cross-origin iframes (KCD-TF).
	/Failed to read a named property 'Element' from 'Window': Blocked a frame/,
	// React Router SingleFetchNoResultError: client route tree / single-fetch
	// response skew across deploys (stale tab). Distinctive framework message from
	// unwrapSingleFetchResult — not an app missing-route bug (KCD-VP family).
	/No result found for routeId "/,
	// HTML document body parsed as JSON — distinctive "<!DOCTYPE" payload
	// (KCD-ZJ / __manifest edge HTML).
	HTML_AS_JSON_ERROR,
	// Safari / extension CustomEvent wrapping unhandledrejection (KCD-S8).
	// Sentry serializes the Event itself when it is the rejection reason.
	CUSTOM_EVENT_UNHANDLED_REJECTION_MESSAGE,
]

export const SENTRY_DENY_URLS: Array<RegExp> = [
	/chrome-extension:\/\//i,
	/moz-extension:\/\//i,
	/safari-web-extension:\/\//i,
	/safari-extension:\/\//i,
	/webkit-masked-url:\/\//i,
	// Android in-app browser injected scripts (Instagram, etc.).
	/iabjs:/i,
	// Check Point Zero Phishing corporate security inject (KCD-102).
	/(?:^|\/\/)zerophishing\.iaas\.checkpoint\.com(?::\d+)?(?:\/|$|\?)/i,
]

type SentryExceptionValue = {
	type?: string | null
	value?: string | null
	stacktrace?: {
		frames?: Array<{
			filename?: string | null
			absPath?: string | null
			function?: string | null
			inApp?: boolean | null
			/** Sentry source context: [lineNo, lineText] pairs when available. */
			context?: Array<
				[number, string] | { line?: number; value?: string }
			> | null
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
	data?: {
		url?: string | null
		arguments?: Array<unknown> | null
	} | null
}

type SerializedRejectionExtra = {
	code?: unknown
	message?: unknown
	stack?: unknown
	type?: unknown
	isTrusted?: unknown
	detail?: unknown
	target?: unknown
	currentTarget?: unknown
}

type SentryEventLike = {
	message?: string | null
	request?: { url?: string | null } | null
	exception?: { values?: Array<SentryExceptionValue> | null } | null
	extra?: {
		route_error_response?: RouteErrorResponseExtra | null
		__serialized__?: SerializedRejectionExtra | null
	} | null
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

/**
 * Chrome / Chromium Google Translate (and similar DOM mutators) reparent text
 * nodes so React's next removeChild/insertBefore throws NotFoundError.
 * Safari Translate surfaces the same DOMException as a shorter message.
 * Distinctive signatures from KCD-S5 / KCD-XQ / KCD-ZE (facebook/react#11538).
 */
const TRANSLATOR_DOM_MUTATION_MESSAGE =
	/Failed to execute '(?:removeChild|insertBefore)' on 'Node': The node (?:to be removed|before which the new node is to be inserted) is not a child of this node\.|The object can not be found here\./i

const REACT_DOM_MUTATION_STACK =
	/react-dom|commitDeletionEffects|commitMutationEffects|removeChild|insertBefore/i

/**
 * React Fiber invariant when Firefox fires MessageChannel during a blocking
 * API (`alert` / `confirm` / `prompt` / nested work) while the scheduler is
 * already in render/commit (facebook/react#17355, Bugzilla 758004). KCD-YT.
 */
const REACT_SCHEDULER_ALREADY_WORKING = /^Should not already be working\.?$/i

const REACT_SCHEDULER_REENTRANCY_FRAME =
	/performWorkUntilDeadline|performWorkOnRootViaSchedulerTask|performSyncWorkOnRoot|scheduler(?:\.production)?(?:\.min)?\.js|react-dom(?:-client)?(?:\.production)?(?:\.min)?\.js/i

function isReactSchedulerReentrancyFrame(frame: {
	filename?: string | null
	function?: string | null
}): boolean {
	return REACT_SCHEDULER_REENTRANCY_FRAME.test(
		`${frame.filename ?? ''} ${frame.function ?? ''}`,
	)
}

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
		.map((frame) => `${frame.filename ?? ''}\n${frame.function ?? ''}`)
		.join('\n')
	const errorStack =
		originalException instanceof Error ? (originalException.stack ?? '') : ''
	return `${frameFiles}\n${errorStack}`
}

function breadcrumbBlob(event: SentryEventLike): string {
	return (event.breadcrumbs ?? [])
		.map(
			(crumb) =>
				`${crumb.category ?? ''}\n${crumb.message ?? ''}\n${crumb.data?.url ?? ''}`,
		)
		.join('\n')
}

/**
 * Native `fetch` never resolves to `undefined`. When React Router then reads
 * `.ok` / `.status`, that alone is not enough to drop — a first-party broken
 * wrapper would look the same. Require the injected interceptor's adjacent
 * trailing `URL:` → `Options:` console breadcrumbs (not in app/RR source)
 * before classifying as extension noise (KCD-ZY / KCD-ZX).
 */
const UNDEFINED_FETCH_RESPONSE_PROP =
	/Cannot read properties of undefined \(reading '(?:ok|status)'\)|undefined is not an object \(evaluating ['"].*\.(?:ok|status)['"]\)/

const REACT_ROUTER_FETCH_RESPONSE_CONSUMERS =
	/fetchAndApplyManifestPatches|fetchAndDecodeViaTurboStream|Failed to fetch manifest patches/

function isUrlInterceptorMessage(message: string): boolean {
	return message === 'URL:' || message.startsWith('URL: ')
}

function isOptionsInterceptorMessage(message: string): boolean {
	return message === 'Options:' || message.startsWith('Options: ')
}

function crumbTexts(crumb: SentryBreadcrumbLike): Array<string> {
	const texts: Array<string> = []
	if (typeof crumb.message === 'string' && crumb.message) {
		texts.push(crumb.message)
	}
	for (const arg of crumb.data?.arguments ?? []) {
		if (typeof arg === 'string' && arg) texts.push(arg)
	}
	return texts
}

/**
 * Injected fetch wrappers seen in KCD-ZY/ZX log `URL:` then `Options:` as
 * adjacent trailing console breadcrumbs immediately before the broken fetch.
 */
export function hasInjectedFetchInterceptorBreadcrumbs(
	event: SentryEventLike,
): boolean {
	const consoleCrumbs = (event.breadcrumbs ?? []).filter(
		(crumb) => (crumb.category ?? 'console') === 'console',
	)
	if (consoleCrumbs.length < 2) return false

	const trailing = consoleCrumbs.slice(-6)
	for (let i = 0; i < trailing.length - 1; i++) {
		const current = crumbTexts(trailing[i] ?? {})
		const next = crumbTexts(trailing[i + 1] ?? {})
		if (
			current.some(isUrlInterceptorMessage) &&
			next.some(isOptionsInterceptorMessage)
		) {
			return true
		}
	}
	return false
}

export function isBrokenClientFetchContractError(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const looksLikeUndefinedResponse = eventMessages(event).some((message) =>
		UNDEFINED_FETCH_RESPONSE_PROP.test(message),
	)
	if (!looksLikeUndefinedResponse) return false
	if (
		!REACT_ROUTER_FETCH_RESPONSE_CONSUMERS.test(
			stackBlob(event, hint.originalException),
		)
	) {
		return false
	}
	return hasInjectedFetchInterceptorBreadcrumbs(event)
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

export function isCloudflareEdgeRouteErrorEvent(
	event: SentryEventLike,
): boolean {
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

	if (
		!messages.some((message) =>
			REACT_ROUTER_EDGE_HTTP_STATUS_MESSAGE.test(message),
		)
	) {
		return false
	}

	return REACT_ROUTER_MANIFEST_PATCH_STACK.test(stackBlob(event, original))
}

function exceptionMessage(exception: unknown): string {
	if (exception instanceof Error) return exception.message
	if (
		typeof exception === 'object' &&
		exception &&
		'message' in exception &&
		typeof (exception as { message?: unknown }).message === 'string'
	) {
		return (exception as { message: string }).message
	}
	return ''
}

/**
 * Drop React's "Should not already be working" invariant when the stack is
 * exclusively the scheduler → react-dom work loop (Firefox MessageChannel
 * re-entrancy during blocking APIs). Require the exact message plus that
 * stack with no in-app frames — never the phrase alone (KCD-YT /
 * facebook/react#17355).
 */
export function isReactSchedulerAlreadyWorkingNoise(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const original = hint.originalException
	const messageMatches = eventMessages(event).some((message) =>
		REACT_SCHEDULER_ALREADY_WORKING.test(message.trim()),
	)
	if (
		!messageMatches &&
		!REACT_SCHEDULER_ALREADY_WORKING.test(exceptionMessage(original).trim())
	) {
		return false
	}

	const frames = (event.exception?.values ?? []).flatMap(
		(value) => value.stacktrace?.frames ?? [],
	)
	// Need attributed frames so we can prove exclusivity — message alone is
	// not enough, and mixed third-party frames must stay reportable.
	if (frames.length === 0) return false
	if (frames.some((frame) => frame.inApp)) return false
	if (!frames.every(isReactSchedulerReentrancyFrame)) return false

	const blob = `${frames
		.map((frame) => `${frame.filename ?? ''} ${frame.function ?? ''}`)
		.join('\n')}\n${stackBlob(event, original)}`
	// Bundled/minified stacks without sourcemaps still count when the only
	// frames are scheduler / react-dom — reject app route paths.
	if (/\/app\/|\/routes\/|components\//i.test(blob)) return false

	return true
}

/**
 * Drop React NotFoundError noise caused by in-page translators / extensions
 * mutating the DOM under React. Require the distinctive message plus a
 * react-dom/native mutation stack with no in-app frames — never the Safari
 * phrase alone.
 */
export function isTranslatorDomMutationNoise(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const original = hint.originalException
	const exceptionValues = event.exception?.values ?? []
	const messageMatches = eventMessages(event).some((message) =>
		TRANSLATOR_DOM_MUTATION_MESSAGE.test(message),
	)
	if (
		!messageMatches &&
		!TRANSLATOR_DOM_MUTATION_MESSAGE.test(exceptionMessage(original))
	) {
		return false
	}

	const namedNotFound = exceptionValues.some(
		(value) => value.type === 'NotFoundError' || value.type === 'DOMException',
	)
	const originalIsNotFound =
		(original instanceof Error &&
			(original.name === 'NotFoundError' ||
				original.name === 'DOMException')) ||
		(typeof DOMException !== 'undefined' && original instanceof DOMException)
	if (!namedNotFound && !originalIsNotFound) return false

	const frames = exceptionValues.flatMap(
		(value) => value.stacktrace?.frames ?? [],
	)
	if (frames.some((frame) => frame.inApp)) return false

	const frameBlob = frames
		.map((frame) => `${frame.filename ?? ''} ${frame.function ?? ''}`)
		.join('\n')
	const blob = `${frameBlob}\n${stackBlob(event, original)}`
	if (!REACT_DOM_MUTATION_STACK.test(blob)) return false

	// Bundled/minified stacks without sourcemaps still count when the only
	// frames are entry.client / react-dom / native — reject app route paths.
	if (/\/app\/|\/routes\/|components\//i.test(blob)) return false

	return true
}

function frameContextLines(
	frame: NonNullable<
		NonNullable<SentryExceptionValue['stacktrace']>['frames']
	>[number],
): Array<string> {
	const lines: Array<string> = []
	for (const entry of frame.context ?? []) {
		if (Array.isArray(entry)) {
			const line = entry[1]
			if (typeof line === 'string') lines.push(line)
			continue
		}
		if (entry && typeof entry.value === 'string') lines.push(entry.value)
	}
	return lines
}

/**
 * True when a stack filename is a document URL (HTML route) rather than a
 * bundled script/module asset. Used to prove HTML-was-parsed-as-JS.
 */
export function isHtmlDocumentScriptFilename(filename: string): boolean {
	const value = filename.trim()
	if (!value) return false
	if (
		/^(?:blob:|data:|webpack:|chrome-extension:|moz-extension:|safari-web-extension:|safari-extension:|webkit-masked-url:|iabjs:)/i.test(
			value,
		)
	) {
		return false
	}
	if (value === '[native code]' || value === '<anonymous>') return false
	if (SCRIPT_OR_ASSET_FILENAME.test(value)) return false
	if (/\/assets\//i.test(value)) return false
	// Document paths: "/blog/...", "https://host/blog/...", sometimes bare host URLs.
	return /^(?:https?:\/\/[^/]+)?\/(?!node_modules\/)/i.test(value)
}

/**
 * Firefox HTML-document-as-script SyntaxError (KCD-105).
 *
 * When a browser loads an HTML page URL as a script, Chrome surfaces
 * `Unexpected token '<', "<!DOCTYPE"` (ignoreErrors). Firefox instead throws
 * `illegal character U+XXXX` for a C1/control codepoint in that HTML, with the
 * document URL as the only stack filename and often `<!DOCTYPE` in frame
 * context. Require the Firefox message plus HTML-document evidence — never the
 * illegal-character phrase alone (a real bundle containing C1 controls should
 * still alert).
 */
export function isHtmlDocumentAsScriptNoise(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const original = hint.originalException
	const messages = eventMessages(event)
	if (original instanceof Error) messages.push(original.message)

	const firefoxIllegal = messages.some((message) =>
		FIREFOX_ILLEGAL_CHARACTER_SYNTAX.test(message.trim()),
	)
	if (!firefoxIllegal) return false

	const namedSyntaxError = (event.exception?.values ?? []).some(
		(value) => value.type === 'SyntaxError',
	)
	const originalIsSyntaxError =
		original instanceof Error && original.name === 'SyntaxError'
	if (!namedSyntaxError && !originalIsSyntaxError) return false

	const frames = (event.exception?.values ?? []).flatMap(
		(value) => value.stacktrace?.frames ?? [],
	)
	if (frames.length === 0) return false

	return frames.some((frame) => {
		if (
			frameContextLines(frame).some((line) =>
				HTML_DOCTYPE_SOURCE_LINE.test(line),
			)
		) {
			return true
		}
		const filename = frame.filename ?? frame.absPath ?? ''
		return isHtmlDocumentScriptFilename(filename)
	})
}

/**
 * React Router client data-protocol failures when `.data` / `__manifest`
 * responses are HTML, empty, or truncated (edge/intermediary), not app throws.
 *
 * - `<!DOCTYPE` in a JSON SyntaxError is the HTML payload signature (ignoreErrors).
 * - Turbo-stream decode requires RR single-fetch stack or `.data`/`__manifest`
 *   breadcrumb evidence — never the message alone (KCD-XF/YY/Y8).
 * - Safari pattern SyntaxError is scoped to manifest patch fetches (KCD-XG/X3).
 * - Firefox `illegal character U+XXXX` when an HTML document URL is the script
 *   source is handled by `isHtmlDocumentAsScriptNoise` (KCD-105).
 */
export function isReactRouterDataProtocolNoise(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const messages = eventMessages(event)
	if (messages.some((message) => HTML_AS_JSON_ERROR.test(message))) {
		return true
	}

	const evidence = `${stackBlob(event, hint.originalException)}\n${breadcrumbBlob(event)}`
	const protocolEvidence =
		REACT_ROUTER_TURBO_STREAM_STACK.test(evidence) ||
		REACT_ROUTER_DATA_PROTOCOL_MANIFEST_STACK.test(evidence) ||
		DATA_PROTOCOL_REQUEST.test(evidence)

	if (
		messages.some((message) => message.includes(TURBO_STREAM_DECODE_ERROR)) &&
		protocolEvidence
	) {
		return true
	}

	const safariPattern = messages.some((message) =>
		SAFARI_JSON_PATTERN_ERROR.test(message.trim()),
	)
	if (!safariPattern) return false

	return (
		REACT_ROUTER_DATA_PROTOCOL_MANIFEST_STACK.test(evidence) ||
		DATA_PROTOCOL_REQUEST.test(evidence)
	)
}

/**
 * EIP-1193 wallet-extension ProviderRpcError codes that this site never emits.
 * 4001 user-rejected (KCD-ZV); 4900/4901 provider/chain disconnected (KCD-YX)
 * with chrome-extension stacks in `__serialized__.stack`.
 */
const WALLET_PROVIDER_DISCONNECT_MESSAGE =
	/provider is disconnected from (?:all chains|the requested chain)/i

function isEip1193ProviderNoiseCode(code: unknown): boolean {
	return (
		code === 4001 ||
		code === '4001' ||
		code === 4900 ||
		code === '4900' ||
		code === 4901 ||
		code === '4901'
	)
}

function providerCodeFrom(value: unknown): unknown {
	if (!value || typeof value !== 'object' || !('code' in value))
		return undefined
	return (value as { code?: unknown }).code
}

function serializedRejection(
	event: SentryEventLike,
): SerializedRejectionExtra | null {
	return event.extra?.__serialized__ ?? null
}

/**
 * EIP-1193 wallet extensions reject with provider codes / phrases. Only drop
 * when that provider signal is present — never on a generic non-Error object
 * message alone.
 */
export function isWalletUserRejection(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const original = hint.originalException
	const serialized = serializedRejection(event)
	const code = providerCodeFrom(original) ?? providerCodeFrom(serialized)
	if (isEip1193ProviderNoiseCode(code)) {
		return true
	}

	const originalMessage = exceptionMessage(original)
	const serializedMessage =
		typeof serialized?.message === 'string' ? serialized.message : ''
	const serializedStack =
		typeof serialized?.stack === 'string' ? serialized.stack : ''

	const looksLikeUserRejection = eventMessages(event).some((message) =>
		/user rejected the request/i.test(message),
	)
	const looksLikeProviderDisconnect =
		WALLET_PROVIDER_DISCONNECT_MESSAGE.test(originalMessage) ||
		WALLET_PROVIDER_DISCONNECT_MESSAGE.test(serializedMessage) ||
		eventMessages(event).some((message) =>
			WALLET_PROVIDER_DISCONNECT_MESSAGE.test(message),
		)

	if (!looksLikeUserRejection && !looksLikeProviderDisconnect) return false

	// Extension background stacks are conclusive even without event frames.
	if (
		WALLET_PROVIDER_STACK.test(serializedStack) ||
		/chrome-extension:|moz-extension:/i.test(serializedStack)
	) {
		return true
	}

	// Non-Error wallet rejections often have zero frames; require a provider
	// marker whenever any stack evidence exists.
	if (hasStackFrames(event) || original instanceof Error) {
		return WALLET_PROVIDER_STACK.test(stackBlob(event, original))
	}

	return (event.exception?.values ?? []).some(
		(value) =>
			value.type === 'UnhandledRejection' ||
			/Non-Error promise rejection/i.test(value.value ?? '') ||
			/Object captured as promise rejection with keys:/i.test(
				value.value ?? '',
			),
	)
}

/**
 * Safari / injected scripts sometimes reject with a CustomEvent whose type is
 * `unhandledrejection` (detail often null, isTrusted false). Sentry titles
 * these `<unknown>` with zero frames (KCD-S8). Distinctive SDK message +
 * CustomEvent type — not a generic Event filter.
 */
export function isCustomEventUnhandledRejectionNoise(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	if (
		eventMessages(event).some((message) =>
			CUSTOM_EVENT_UNHANDLED_REJECTION_MESSAGE.test(message),
		)
	) {
		return true
	}

	const namedCustomEvent = (event.exception?.values ?? []).some(
		(value) => value.type === 'CustomEvent',
	)
	const original = hint.originalException
	const originalIsCustomEvent =
		(typeof CustomEvent !== 'undefined' && original instanceof CustomEvent) ||
		(typeof original === 'object' &&
			original != null &&
			(original as { constructor?: { name?: string } }).constructor?.name ===
				'CustomEvent')

	if (!namedCustomEvent && !originalIsCustomEvent) return false

	const serialized = serializedRejection(event)
	const originalType =
		original && typeof original === 'object' && 'type' in original
			? (original as { type?: unknown }).type
			: undefined
	return (
		originalType === 'unhandledrejection' ||
		serialized?.type === 'unhandledrejection'
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
	const filenames = frames.map((frame) => frame.filename ?? '').filter(Boolean)
	if (filenames.length > 0) {
		return filenames.every((filename) => /^blob:/i.test(filename))
	}

	// No Sentry frame filenames — parse URLs out of Error.stack (stackBlob
	// prefixes a newline, so ^blob: on the whole string would never match).
	const urls = scriptUrlsFromStackBlob(stackBlob(event, hint.originalException))
	return urls.length > 0 && urls.every((url) => /^blob:/i.test(url))
}

function isCallStackOverflow(event: SentryEventLike): boolean {
	return eventMessages(event).some((message) =>
		CALL_STACK_OVERFLOW.test(message),
	)
}

function exceptionFrames(event: SentryEventLike) {
	return (event.exception?.values ?? []).flatMap(
		(value) => value.stacktrace?.frames ?? [],
	)
}

function isUnattributedStackFilename(
	filename: string | null | undefined,
): boolean {
	return (
		filename == null ||
		filename === '' ||
		filename === 'undefined' ||
		filename === 'null'
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
	return frames.every((frame) => isUnattributedStackFilename(frame.filename))
}

function isUnusableOrHtmlDocumentAttribution(
	value: string | null | undefined,
): boolean {
	if (isUnattributedStackFilename(value)) return true
	if (typeof value !== 'string') return false
	return isHtmlDocumentScriptFilename(value)
}

/**
 * Translator overflows on iOS Chrome sometimes attribute minified React frames
 * to the HTML document URL (inline script / document path) instead of
 * `filename: "undefined"` (KCD-108 / KCD-107 / KCD-106). Those are still not
 * first-party bundle frames — treat them like unusable attribution here.
 *
 * Inspect both `filename` and `absPath`: a placeholder in one field must not
 * hide a real bundle URL in the other.
 */
export function hasOnlyUnusableOrHtmlDocumentStackFrames(
	event: SentryEventLike,
): boolean {
	const frames = exceptionFrames(event)
	if (frames.length === 0) return true
	return frames.every((frame) => {
		const candidates = [frame.filename, frame.absPath].filter(
			(value, index, values) => values.indexOf(value) === index,
		)
		if (candidates.length === 0) return true
		return candidates.every((value) =>
			isUnusableOrHtmlDocumentAttribution(value),
		)
	})
}

/**
 * React Router production `sanitizeError` replaces thrown Errors with
 * `new Error("Unexpected Server Error")` and clears `stack` before they reach
 * the client (see react-router `sanitizeError` / turbo-stream `SanitizedError`).
 * Sentry then gets a useless empty-stack client event (KCD-SE) while
 * `entry.server` `handleError` already has the real server error.
 *
 * Require the exact message plus no usable frames / falsy Error.stack — never
 * the phrase alone (an app could throw the same text with a real stack).
 */
export function isReactRouterSanitizedServerErrorInstance(
	error: unknown,
): boolean {
	return (
		error instanceof Error &&
		error.message === 'Unexpected Server Error' &&
		!error.stack
	)
}

export function isReactRouterSanitizedServerError(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	if (isReactRouterSanitizedServerErrorInstance(hint.originalException)) {
		return true
	}

	const messageMatches = eventMessages(event).some(
		(message) => message.trim() === 'Unexpected Server Error',
	)
	if (!messageMatches) return false

	// Filename-less frames are usually unusable, but an explicit in-app frame
	// still counts as attributed app code — keep those events for triage.
	if (exceptionFrames(event).some((frame) => frame.inApp === true)) {
		return false
	}

	return hasOnlyUnusableStackFrames(event)
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
	doc:
		| { documentElement?: { className?: string } | null }
		| null
		| undefined = typeof document === 'undefined' ? undefined : document,
): boolean {
	const className = doc?.documentElement?.className
	if (typeof className !== 'string') return false
	return /\btranslated-(?:ltr|rtl)\b/.test(className)
}

/**
 * Page translators (Google Translate / Chrome Translate) mutate React's DOM
 * with nested <font> tags and can recurse until RangeError. Only drop when the
 * stack is unattributed (or HTML-document-attributed) and translator evidence
 * is present (KCD-QW / KCD-108).
 */
export function isPageTranslatorCallStackOverflow(
	event: SentryEventLike,
	options: { pageTranslated?: boolean } = {},
): boolean {
	if (!isCallStackOverflow(event)) return false
	if (!hasOnlyUnusableOrHtmlDocumentStackFrames(event)) return false
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
	if (isTranslatorDomMutationNoise(event, hint)) return true
	if (isReactSchedulerAlreadyWorkingNoise(event, hint)) return true
	if (isWalletUserRejection(event, hint)) return true
	if (isCustomEventUnhandledRejectionNoise(event, hint)) return true
	if (isBrokenClientFetchContractError(event, hint)) return true
	if (isInjectedBlobAddListenerError(event, hint)) return true
	if (isDegradedUiPerformanceEvent(event)) return true
	if (isCloudflareEdgeRouteErrorEvent(event)) return true
	if (isReactRouterEdgeHttpStatusError(event, hint)) return true
	if (isReactRouterDataProtocolNoise(event, hint)) return true
	if (isHtmlDocumentAsScriptNoise(event, hint)) return true
	if (isReactRouterSanitizedServerError(event, hint)) return true
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
