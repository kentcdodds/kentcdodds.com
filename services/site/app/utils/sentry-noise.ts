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
	// React Router single-fetch decode when the body is not turbo-stream
	// (edge/HTML/truncated responses). Exact library message only (KCD-XF family).
	'Unable to decode turbo-stream response',
	// HTML document body parsed as JSON — distinctive "<!DOCTYPE" payload
	// (KCD-ZJ / __manifest edge HTML).
	/Unexpected token '<',\s*"<!DOCTYPE/i,
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

type SentryBreadcrumbLike = {
	category?: string | null
	message?: string | null
	data?: { url?: string | null } | null
}

type SentryEventLike = {
	message?: string | null
	request?: { url?: string | null } | null
	exception?: { values?: Array<SentryExceptionValue> | null } | null
	breadcrumbs?: Array<SentryBreadcrumbLike> | null
}

const WALLET_PROVIDER_STACK =
	/metamask|coinbase|rainbow|walletconnect|phantom|ethereum|eip-1193|inpage\.js|nkbihfbeogaeaoehlefnkodbefgpgknn/i

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

const TURBO_STREAM_DECODE_ERROR = 'Unable to decode turbo-stream response'
const HTML_AS_JSON_ERROR = /Unexpected token '<',\s*"<!DOCTYPE/i
const SAFARI_JSON_PATTERN_ERROR =
	/^The string did not match the expected pattern\.?$/i
const REACT_ROUTER_MANIFEST_STACK =
	/fetchAndApplyManifestPatches|Failed to fetch manifest patches/i
const MANIFEST_REQUEST = /\/__manifest(?:\?|$)/i

/**
 * React Router client data-protocol failures when `.data` / `__manifest`
 * responses are HTML, empty, or truncated (edge/intermediary), not app throws.
 * Evidence: exact RR turbo-stream message; JSON parse of `<!DOCTYPE`; Safari
 * pattern SyntaxError scoped to manifest patch fetches (KCD-XF/XG/X3/ZJ/YY/Y8).
 */
export function isReactRouterDataProtocolNoise(
	event: SentryEventLike,
	hint: { originalException?: unknown } = {},
): boolean {
	const messages = eventMessages(event)
	if (messages.some((message) => message.includes(TURBO_STREAM_DECODE_ERROR))) {
		return true
	}
	if (messages.some((message) => HTML_AS_JSON_ERROR.test(message))) {
		return true
	}

	const safariPattern = messages.some((message) =>
		SAFARI_JSON_PATTERN_ERROR.test(message.trim()),
	)
	if (!safariPattern) return false

	const evidence = `${stackBlob(event, hint.originalException)}\n${breadcrumbBlob(event)}`
	return (
		REACT_ROUTER_MANIFEST_STACK.test(evidence) ||
		MANIFEST_REQUEST.test(evidence)
	)
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
	if (isReactRouterDataProtocolNoise(event, hint)) return true
	if (event.request?.url?.includes('/lookout')) return true
	if (event.request?.url?.includes('translate-pa.googleapis.com')) return true
	return false
}
