import { expect, test } from 'vitest'
import {
	SENTRY_DENY_URLS,
	SENTRY_IGNORE_ERRORS,
	isBrowserExtensionError,
	isCloudflareEdgeErrorHtml,
	isCloudflareEdgeRouteError,
	isDegradedUiPerformanceEvent,
	isReactRouterEdgeHttpStatusError,
	isWalletUserRejection,
	shouldDropSentryEvent,
} from '../sentry-noise.ts'

function matchesIgnoreError(message: string) {
	return SENTRY_IGNORE_ERRORS.some((pattern) => {
		if (typeof pattern === 'string') return message.includes(pattern)
		return pattern.test(message)
	})
}

function matchesDenyUrl(url: string) {
	return SENTRY_DENY_URLS.some((pattern) => pattern.test(url))
}

test('filters Outlook SafeLinks Non-Error rejection (KCD-1K)', () => {
	expect(
		matchesIgnoreError(
			'Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4',
		),
	).toBe(true)
})

test('filters Firefox for iOS __firefox__ bridge (KCD-RB)', () => {
	expect(matchesIgnoreError("Can't find variable: __firefox__")).toBe(true)
	expect(matchesIgnoreError('__firefox__ is not defined')).toBe(true)
})

test('filters WebExtension runtime.sendMessage tab-not-found (KCD-JC)', () => {
	expect(
		matchesIgnoreError('Invalid call to runtime.sendMessage(). Tab not found.'),
	).toBe(true)
})

test('filters injected extension post Method not found (KCD-W9)', () => {
	expect(matchesIgnoreError('Error invoking post: Method not found')).toBe(true)
})

test('scopes EIP-1193 wallet user rejection (KCD-ZV)', () => {
	expect(matchesIgnoreError('user rejected the request')).toBe(false)

	expect(
		isWalletUserRejection(
			{},
			{
				originalException: { code: 4001, message: 'User rejected the request' },
			},
		),
	).toBe(true)

	expect(
		isWalletUserRejection({
			exception: {
				values: [
					{
						type: 'UnhandledRejection',
						value:
							'Non-Error promise rejection captured with value: user rejected the request',
					},
				],
			},
		}),
	).toBe(true)

	expect(
		isWalletUserRejection({
			exception: {
				values: [
					{
						type: 'Error',
						value: 'user rejected the request',
						stacktrace: {
							frames: [{ filename: '/app/routes/checkout.tsx' }],
						},
					},
				],
			},
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent(
			{
				exception: {
					values: [
						{
							type: 'UnhandledRejection',
							value:
								'Non-Error promise rejection captured with value: user rejected the request',
						},
					],
				},
			},
			{
				originalException: { code: 4001, message: 'User rejected the request' },
			},
		),
	).toBe(true)
})

test('filters Android in-app browser postMessage bridge (KCD-ZM)', () => {
	expect(
		matchesIgnoreError('Error invoking postMessage: Java object is gone'),
	).toBe(true)
	expect(matchesDenyUrl('iabjs://navigation_performance_logger_android')).toBe(
		true,
	)
})

test('filters injected og:type meta scrapers (KCD-2K family)', () => {
	expect(
		matchesIgnoreError(
			"null is not an object (evaluating 'document.querySelector(\"meta[property='og:type']\").content')",
		),
	).toBe(true)
})

test('filters injected elem.firstChild parsers (KCD-ZZ)', () => {
	expect(
		matchesIgnoreError(
			"undefined is not an object (evaluating 'elem.firstChild')",
		),
	).toBe(true)
})

test('filters React Router single-fetch routeId skew (KCD-VP family)', () => {
	expect(
		matchesIgnoreError('No result found for routeId "routes/courses"'),
	).toBe(true)
	expect(
		matchesIgnoreError(
			'No result found for routeId "routes/blog_/$slug"',
		),
	).toBe(true)
	expect(
		matchesIgnoreError(
			'No result found for routeId "routes/calls/$season/$episode/$slug"',
		),
	).toBe(true)
	expect(matchesIgnoreError('No result found for route')).toBe(false)
})

test('keeps Module load timeout filter (KCD-ZS / KCD-ZT)', () => {
	expect(matchesIgnoreError('Module load timeout: m_1001')).toBe(true)
	expect(matchesIgnoreError('Module load timeout: m_1004')).toBe(true)
})

test('does not broadly ignore generic Failed to fetch', () => {
	expect(matchesIgnoreError('Failed to fetch (kentcdodds.com)')).toBe(false)
	expect(matchesIgnoreError('Load failed')).toBe(false)
	expect(
		matchesIgnoreError('NetworkError when attempting to fetch resource.'),
	).toBe(false)
})

test('filters Cloudflare edge RouteErrorResponse HTML (KCD-VH family)', () => {
	const badGatewayHtml = `<!DOCTYPE html><html><head><title>kentcdodds.com | 502: Bad gateway</title></head><body>Ray ID: abc123 cloudflare</body></html>`
	const timeoutHtml = `<!DOCTYPE html><html><head><title>kentcdodds.com | 524: A timeout occurred</title></head><body>Cloudflare Ray ID: xyz</body></html>`

	expect(isCloudflareEdgeErrorHtml(badGatewayHtml)).toBe(true)
	expect(isCloudflareEdgeErrorHtml(timeoutHtml)).toBe(true)
	expect(isCloudflareEdgeErrorHtml('<title>App Error</title>')).toBe(false)

	expect(
		isCloudflareEdgeRouteError({
			status: 502,
			statusText: '',
			data: badGatewayHtml,
		}),
	).toBe(true)
	expect(
		isCloudflareEdgeRouteError({
			status: 503,
			statusText: '',
			data: '',
		}),
	).toBe(true)
	expect(
		isCloudflareEdgeRouteError({
			status: 502,
			statusText: '',
			data: 'Failed to proxy request to Sentry',
		}),
	).toBe(false)
	expect(
		isCloudflareEdgeRouteError({
			status: 503,
			statusText: '',
			data: { error: 'Search temporarily unavailable' },
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent({
			exception: {
				values: [{ type: 'RouteErrorResponse', value: '502 Route Error' }],
			},
			extra: {
				route_error_response: {
					status: 502,
					statusText: '',
					data: badGatewayHtml,
				},
			},
		}),
	).toBe(true)
})

test('filters React Router manifest-patch edge HTTP status errors (KCD-ZH/YD/YF)', () => {
	const original = new Error('502 ')
	original.stack =
		'Error: 502 \n    at fetchAndApplyManifestPatches (react-router/dist/chunk.js:1:1)'

	expect(
		isReactRouterEdgeHttpStatusError(
			{
				exception: {
					values: [
						{
							type: 'Error',
							value: '502 ',
							stacktrace: {
								frames: [
									{
										filename:
											'../../../node_modules/react-router/dist/development/chunk.mjs',
										function: 'fetchAndApplyManifestPatches',
									},
								],
							},
						},
					],
				},
			},
			{ originalException: original },
		),
	).toBe(true)

	expect(
		isReactRouterEdgeHttpStatusError({
			exception: {
				values: [
					{
						type: 'Error',
						value: '502 ',
						stacktrace: {
							frames: [{ filename: '/app/routes/blog.tsx', function: 'loader' }],
						},
					},
				],
			},
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent(
			{
				exception: {
					values: [
						{
							type: 'Error',
							value: '503 ',
							stacktrace: {
								frames: [
									{
										filename: 'react-router/dist/chunk.mjs',
										function: 'fetchAndApplyManifestPatches',
									},
								],
							},
						},
					],
				},
			},
			{
				originalException: Object.assign(new Error('503 '), {
					stack: 'Error: 503 \n    at fetchAndApplyManifestPatches (x:1:1)',
				}),
			},
		),
	).toBe(true)
})

test('detects browser extension stacks and denyUrls', () => {
	const extensionError = new Error('boom')
	extensionError.stack =
		'Error: boom\n    at chrome-extension://abc/content.js:1:1'
	expect(isBrowserExtensionError(extensionError)).toBe(true)
	expect(matchesDenyUrl('chrome-extension://abc/content.js')).toBe(true)
	expect(matchesDenyUrl('moz-extension://abc/content.js')).toBe(true)

	const anonymousScriptError = new Error('boom')
	anonymousScriptError.stack =
		'Error: boom\n    at anonymous scripts:1:1\n    at /app/routes/blog.tsx:10:2'
	expect(isBrowserExtensionError(anonymousScriptError)).toBe(false)
})

test('drops degraded UI performance noise and lookout/translate requests', () => {
	expect(
		isDegradedUiPerformanceEvent({ message: 'Degraded UI Performance' }),
	).toBe(true)
	expect(
		shouldDropSentryEvent({
			message: 'Degraded UI Performance',
		}),
	).toBe(true)
	expect(
		shouldDropSentryEvent({
			request: { url: 'https://kentcdodds.com/resources/lookout' },
		}),
	).toBe(true)
	expect(
		shouldDropSentryEvent({
			request: { url: 'https://translate-pa.googleapis.com/v1/translate' },
		}),
	).toBe(true)
	expect(
		shouldDropSentryEvent({
			message: 'Real app bug',
			request: { url: 'https://kentcdodds.com/blog' },
		}),
	).toBe(false)
})
