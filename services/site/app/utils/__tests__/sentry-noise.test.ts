import { expect, test } from 'vitest'
import {
	SENTRY_DENY_URLS,
	SENTRY_IGNORE_ERRORS,
	hasInjectedFetchInterceptorBreadcrumbs,
	hasOnlyUnusableStackFrames,
	isBrokenClientFetchContractError,
	isBrowserExtensionError,
	isCloudflareEdgeErrorHtml,
	isCloudflareEdgeRouteError,
	isCustomEventUnhandledRejectionNoise,
	isDegradedUiPerformanceEvent,
	isHtmlPageTranslated,
	isInjectedBlobAddListenerError,
	isPageTranslatorCallStackOverflow,
	isReactRouterCsrfAbortError,
	isReactRouterDataProtocolNoise,
	isReactRouterEdgeHttpStatusError,
	isReactSchedulerAlreadyWorkingNoise,
	isTranslatorDomMutationNoise,
	isWalletUserRejection,
	shouldDropSentryEvent,
} from '../sentry-noise.ts'

const injectedFetchInterceptorBreadcrumbs = [
	{
		category: 'console',
		message:
			'URL: https://kentcdodds.com/__manifest?paths=%2Fcourses&version=abc',
		data: {
			arguments: [
				'URL:',
				'https://kentcdodds.com/__manifest?paths=%2Fcourses&version=abc',
			],
		},
	},
	{
		category: 'console',
		message: 'Options: [object Object]',
		data: { arguments: ['Options:', { headers: '[Object]' }] },
	},
]

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

test('filters EIP-1193 provider disconnect non-Error rejection (KCD-YX)', () => {
	const objectCaptured =
		'Object captured as promise rejection with keys: code, message, stack'
	expect(matchesIgnoreError(objectCaptured)).toBe(false)

	expect(
		isWalletUserRejection({
			exception: {
				values: [{ type: 'UnhandledRejection', value: objectCaptured }],
			},
			extra: {
				__serialized__: {
					code: 4900,
					message: 'The provider is disconnected from all chains.',
					stack:
						'Error: The provider is disconnected from all chains.\n    at chrome-extension://acmacodkjbdgmoleebolmdjonilkdbch/background.js:4:7655111',
				},
			},
		}),
	).toBe(true)

	expect(
		isWalletUserRejection(
			{
				exception: {
					values: [{ type: 'UnhandledRejection', value: objectCaptured }],
				},
			},
			{
				originalException: {
					code: 4900,
					message: 'The provider is disconnected from all chains.',
				},
			},
		),
	).toBe(true)

	// Generic object-captured noise without provider signal must stay.
	expect(
		isWalletUserRejection({
			exception: {
				values: [{ type: 'UnhandledRejection', value: objectCaptured }],
			},
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent({
			exception: {
				values: [{ type: 'UnhandledRejection', value: objectCaptured }],
			},
			extra: {
				__serialized__: {
					code: 4900,
					message: 'The provider is disconnected from all chains.',
					stack:
						'Error: The provider is disconnected from all chains.\n    at chrome-extension://lgmpcpglpngdoalbgeoldeajfclnhafa/background.js:141:142584',
				},
			},
		}),
	).toBe(true)
})

test('filters Safari CustomEvent unhandledrejection noise (KCD-S8)', () => {
	const customEventMessage =
		'Event `CustomEvent` (type=unhandledrejection) captured as promise rejection'
	expect(matchesIgnoreError(customEventMessage)).toBe(true)

	expect(
		isCustomEventUnhandledRejectionNoise({
			exception: {
				values: [{ type: 'CustomEvent', value: customEventMessage }],
			},
			extra: {
				__serialized__: {
					type: 'unhandledrejection',
					isTrusted: false,
					detail: null,
					target: '[object Window]',
					currentTarget: '[object Window]',
				},
			},
		}),
	).toBe(true)

	expect(
		isCustomEventUnhandledRejectionNoise({
			exception: {
				values: [{ type: 'Error', value: 'real app failure' }],
			},
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent({
			exception: {
				values: [{ type: 'CustomEvent', value: customEventMessage }],
			},
		}),
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

test('filters React Firefox scheduler re-entrancy (KCD-YT)', () => {
	const firefoxSchedulerEvent = {
		exception: {
			values: [
				{
					type: 'Error',
					value: 'Should not already be working.',
					stacktrace: {
						frames: [
							{
								filename:
									'../../../node_modules/scheduler/cjs/scheduler.production.js',
								function: 'performWorkUntilDeadline',
								inApp: false,
							},
							{
								filename:
									'../../../node_modules/react-dom/cjs/react-dom-client.production.js',
								function: 'performWorkOnRootViaSchedulerTask',
								inApp: false,
							},
						],
					},
				},
			],
		},
	}
	expect(isReactSchedulerAlreadyWorkingNoise(firefoxSchedulerEvent)).toBe(true)
	expect(shouldDropSentryEvent(firefoxSchedulerEvent)).toBe(true)

	// Exact phrase alone (no scheduler/react-dom stack) must not drop.
	expect(
		isReactSchedulerAlreadyWorkingNoise({
			exception: {
				values: [
					{
						type: 'Error',
						value: 'Should not already be working.',
					},
				],
			},
		}),
	).toBe(false)

	// Mixed stack with an unrelated non-app frame must stay reportable.
	expect(
		isReactSchedulerAlreadyWorkingNoise({
			exception: {
				values: [
					{
						type: 'Error',
						value: 'Should not already be working.',
						stacktrace: {
							frames: [
								{
									filename: 'https://cdn.example.com/injected.js',
									function: 'hijack',
									inApp: false,
								},
								{
									filename:
										'../../../node_modules/react-dom/cjs/react-dom-client.production.js',
									function: 'performWorkOnRootViaSchedulerTask',
									inApp: false,
								},
							],
						},
					},
				],
			},
		}),
	).toBe(false)

	// In-app frames mean a real app re-entrancy bug — keep reporting.
	expect(
		isReactSchedulerAlreadyWorkingNoise({
			exception: {
				values: [
					{
						type: 'Error',
						value: 'Should not already be working.',
						stacktrace: {
							frames: [
								{
									filename: '/app/routes/blog_/$slug.tsx',
									function: 'Blog',
									inApp: true,
								},
								{
									filename:
										'../../../node_modules/react-dom/cjs/react-dom-client.production.js',
									function: 'performWorkOnRootViaSchedulerTask',
									inApp: false,
								},
							],
						},
					},
				],
			},
		}),
	).toBe(false)
})

test('filters translator DOM mutation NotFoundError (KCD-S5 / KCD-XQ / KCD-ZE)', () => {
	const chromeRemoveChild = {
		exception: {
			values: [
				{
					type: 'NotFoundError',
					value:
						"Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
					stacktrace: {
						frames: [
							{
								filename:
									'../../../../../node_modules/react-dom/cjs/react-dom-client.production.js',
								function: 'commitDeletionEffectsOnFiber',
								inApp: false,
							},
						],
					},
				},
			],
		},
	}
	expect(isTranslatorDomMutationNoise(chromeRemoveChild)).toBe(true)
	expect(shouldDropSentryEvent(chromeRemoveChild)).toBe(true)

	const safariObjectNotFound = {
		exception: {
			values: [
				{
					type: 'NotFoundError',
					value: 'The object can not be found here.',
					stacktrace: {
						frames: [
							{
								filename:
									'../../../../../node_modules/react-dom/cjs/react-dom-client.production.js',
								function: 'commitDeletionEffectsOnFiber',
								inApp: false,
							},
							{
								filename: '[native code]',
								function: 'removeChild',
								inApp: false,
							},
						],
					},
				},
			],
		},
	}
	expect(isTranslatorDomMutationNoise(safariObjectNotFound)).toBe(true)

	// Safari phrase alone (no react-dom stack) must not drop — too generic.
	expect(
		isTranslatorDomMutationNoise({
			exception: {
				values: [
					{
						type: 'NotFoundError',
						value: 'The object can not be found here.',
					},
				],
			},
		}),
	).toBe(false)

	// In-app frames mean a real app DOM bug — keep reporting.
	expect(
		isTranslatorDomMutationNoise({
			exception: {
				values: [
					{
						type: 'NotFoundError',
						value:
							"Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
						stacktrace: {
							frames: [
								{
									filename: '/app/routes/blog.tsx',
									function: 'Blog',
									inApp: true,
								},
								{
									filename:
										'../../../../../node_modules/react-dom/cjs/react-dom-client.production.js',
									function: 'commitDeletionEffectsOnFiber',
									inApp: false,
								},
							],
						},
					},
				],
			},
		}),
	).toBe(false)
})

test('filters React Router single-fetch routeId skew (KCD-VP family)', () => {
	expect(
		matchesIgnoreError('No result found for routeId "routes/courses"'),
	).toBe(true)
	expect(
		matchesIgnoreError('No result found for routeId "routes/blog_/$slug"'),
	).toBe(true)
	expect(
		matchesIgnoreError(
			'No result found for routeId "routes/calls/$season/$episode/$slug"',
		),
	).toBe(true)
	expect(matchesIgnoreError('No result found for route')).toBe(false)
})

test('filters Instagram WKWebView messageHandlers bridge (KCD-ZR / KCD-ZC)', () => {
	expect(
		matchesIgnoreError(
			"undefined is not an object (evaluating 'window.webkit.messageHandlers')",
		),
	).toBe(true)
})

test('filters javascript-obfuscator a0_0x injectors (KCD-ZG)', () => {
	expect(matchesIgnoreError('a0_0x3b27 is not defined')).toBe(true)
	expect(matchesIgnoreError('a0_0xdeadbeef is not defined')).toBe(true)
	expect(matchesIgnoreError('myHelper is not defined')).toBe(false)
})

test('filters Check Point Zero Phishing zp_token inject (KCD-102)', () => {
	expect(matchesIgnoreError('zp_token is not defined')).toBe(true)
	expect(matchesIgnoreError("Can't find variable: zp_token")).toBe(true)
	expect(matchesIgnoreError('auth_token is not defined')).toBe(false)
	expect(
		matchesDenyUrl('https://zerophishing.iaas.checkpoint.com/3/zp.js'),
	).toBe(true)
})

test('filters WKWebView invalid-frame native errors (KCD-YV)', () => {
	expect(
		matchesIgnoreError(
			'Error Domain=WKErrorDomain Code=12 "JavaScript execution targeted an invalid frame"',
		),
	).toBe(true)
})

test('filters Sentry Replay cross-origin iframe Element probes (KCD-TF)', () => {
	expect(
		matchesIgnoreError(
			`Failed to read a named property 'Element' from 'Window': Blocked a frame with origin "https://kentcdodds.com" from accessing a cross-origin frame.`,
		),
	).toBe(true)
})

test('drops extension blob-script addListener noise (KCD-Z7)', () => {
	expect(
		matchesIgnoreError(
			"Cannot read properties of undefined (reading 'addListener')",
		),
	).toBe(false)

	expect(
		isInjectedBlobAddListenerError({
			exception: {
				values: [
					{
						type: 'TypeError',
						value:
							"Cannot read properties of undefined (reading 'addListener')",
						stacktrace: {
							frames: [
								{
									filename:
										'blob:https://kentcdodds.com/28507230-8ee6-4834-abc8-6d4c103e04f1',
								},
								{
									filename:
										'blob:https://kentcdodds.com/28507230-8ee6-4834-abc8-6d4c103e04f1',
								},
							],
						},
					},
				],
			},
		}),
	).toBe(true)

	expect(
		isInjectedBlobAddListenerError({
			exception: {
				values: [
					{
						type: 'TypeError',
						value:
							"Cannot read properties of undefined (reading 'addListener')",
						stacktrace: {
							frames: [{ filename: '/assets/app-abc123.js' }],
						},
					},
				],
			},
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent({
			exception: {
				values: [
					{
						type: 'TypeError',
						value:
							"Cannot read properties of undefined (reading 'addListener')",
						stacktrace: {
							frames: [
								{
									filename:
										'blob:https://kentcdodds.com/28507230-8ee6-4834-abc8-6d4c103e04f1',
								},
							],
						},
					},
				],
			},
		}),
	).toBe(true)

	const blobStackError = new Error(
		"Cannot read properties of undefined (reading 'addListener')",
	)
	blobStackError.stack =
		"TypeError: Cannot read properties of undefined (reading 'addListener')\n    at blob:https://kentcdodds.com/28507230-8ee6-4834-abc8-6d4c103e04f1:14:11\n    at new s.bm (blob:https://kentcdodds.com/28507230-8ee6-4834-abc8-6d4c103e04f1:12:19003)"

	expect(
		isInjectedBlobAddListenerError(
			{
				exception: {
					values: [
						{
							type: 'TypeError',
							value:
								"Cannot read properties of undefined (reading 'addListener')",
						},
					],
				},
			},
			{ originalException: blobStackError },
		),
	).toBe(true)
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
							frames: [
								{ filename: '/app/routes/blog.tsx', function: 'loader' },
							],
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

test('filters React Router turbo-stream decode noise with protocol evidence (KCD-XF family)', () => {
	expect(matchesIgnoreError('Unable to decode turbo-stream response')).toBe(
		false,
	)

	expect(
		isReactRouterDataProtocolNoise({
			exception: {
				values: [
					{
						type: 'Error',
						value: 'Unable to decode turbo-stream response',
						stacktrace: {
							frames: [
								{
									filename:
										'../../../node_modules/react-router/dist/development/chunk-LFPYN7LY.mjs',
									function: 'fetchAndDecodeViaTurboStream',
								},
							],
						},
					},
				],
			},
		}),
	).toBe(true)

	expect(
		isReactRouterDataProtocolNoise({
			exception: {
				values: [
					{ type: 'Error', value: 'Unable to decode turbo-stream response' },
				],
			},
			breadcrumbs: [
				{
					category: 'fetch',
					data: { url: 'https://kentcdodds.com/_root.data' },
				},
			],
		}),
	).toBe(true)

	expect(
		isReactRouterDataProtocolNoise({
			exception: {
				values: [
					{ type: 'Error', value: 'Unable to decode turbo-stream response' },
				],
			},
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent({
			exception: {
				values: [
					{
						type: 'Error',
						value: 'Unable to decode turbo-stream response',
						stacktrace: {
							frames: [
								{
									filename: 'react-router/dist/chunk.mjs',
									function: 'fetchAndDecodeViaTurboStream',
								},
							],
						},
					},
				],
			},
		}),
	).toBe(true)
})

test('filters HTML-as-JSON manifest/data protocol noise (KCD-ZJ)', () => {
	const message = 'Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON'
	expect(matchesIgnoreError(message)).toBe(true)
	expect(
		isReactRouterDataProtocolNoise({
			exception: { values: [{ type: 'SyntaxError', value: message }] },
		}),
	).toBe(true)
})

test('scopes Safari JSON pattern errors to manifest protocol (KCD-XG/X3)', () => {
	expect(
		matchesIgnoreError('The string did not match the expected pattern.'),
	).toBe(false)

	expect(
		isReactRouterDataProtocolNoise({
			exception: {
				values: [
					{
						type: 'SyntaxError',
						value: 'The string did not match the expected pattern.',
						stacktrace: {
							frames: [
								{
									filename:
										'../../../node_modules/react-router/dist/development/chunk-LFPYN7LY.mjs',
									function: 'fetchAndApplyManifestPatches',
								},
								{ filename: '[native code]', function: 'json' },
							],
						},
					},
				],
			},
		}),
	).toBe(true)

	expect(
		isReactRouterDataProtocolNoise({
			exception: {
				values: [
					{
						type: 'SyntaxError',
						value: 'The string did not match the expected pattern.',
					},
				],
			},
			breadcrumbs: [
				{
					category: 'fetch',
					data: {
						url: 'https://kentcdodds.com/__manifest?paths=%2Fblog%2FREADME&version=368d9afc',
					},
				},
			],
		}),
	).toBe(true)

	expect(
		isReactRouterDataProtocolNoise({
			exception: {
				values: [
					{
						type: 'SyntaxError',
						value: 'The string did not match the expected pattern.',
						stacktrace: {
							frames: [
								{ filename: '/app/routes/search.tsx', function: 'loader' },
							],
						},
					},
				],
			},
		}),
	).toBe(false)
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

test('filters page-translator call stack overflows with font breadcrumbs (KCD-QW)', () => {
	const translatorEvent = {
		exception: {
			values: [
				{
					type: 'RangeError',
					value: 'Maximum call stack size exceeded.',
					stacktrace: {
						frames: [{ filename: 'undefined' }],
					},
				},
			],
		},
		breadcrumbs: [
			{
				category: 'ui.click',
				message: 'ul > li > a > font > font',
			},
		],
	}

	expect(hasOnlyUnusableStackFrames(translatorEvent)).toBe(true)
	expect(
		isPageTranslatorCallStackOverflow(translatorEvent, {
			pageTranslated: false,
		}),
	).toBe(true)
	expect(
		shouldDropSentryEvent(translatorEvent, { pageTranslated: false }),
	).toBe(true)

	// Real app frames must still alert even if a translator mutated the DOM.
	expect(
		shouldDropSentryEvent(
			{
				exception: {
					values: [
						{
							type: 'RangeError',
							value: 'Maximum call stack size exceeded.',
							stacktrace: {
								frames: [{ filename: '/assets/entry.client.js' }],
							},
						},
					],
				},
				breadcrumbs: [
					{
						category: 'ui.click',
						message: 'ul > li > a > font > font',
					},
				],
			},
			{ pageTranslated: true },
		),
	).toBe(false)

	// Unattributed stack overflow without translator evidence stays reportable.
	expect(
		shouldDropSentryEvent(
			{
				exception: {
					values: [
						{
							type: 'RangeError',
							value: 'Maximum call stack size exceeded.',
							stacktrace: {
								frames: [{ filename: 'undefined' }],
							},
						},
					],
				},
			},
			{ pageTranslated: false },
		),
	).toBe(false)

	expect(
		shouldDropSentryEvent(
			{
				exception: {
					values: [
						{
							type: 'RangeError',
							value: 'Maximum call stack size exceeded.',
							stacktrace: {
								frames: [{ filename: 'undefined' }],
							},
						},
					],
				},
			},
			{ pageTranslated: true },
		),
	).toBe(true)

	expect(
		isHtmlPageTranslated({
			documentElement: { className: 'translated-ltr' },
		}),
	).toBe(true)
	expect(
		isHtmlPageTranslated({
			documentElement: { className: 'dark' },
		}),
	).toBe(false)
})

test('recognizes React Router CSRF abort messages (KCD-YN)', () => {
	expect(
		isReactRouterCsrfAbortError(
			new Error(
				'host header does not match `origin` header from a forwarded action request. Aborting the action.',
			),
		),
	).toBe(true)
	expect(
		isReactRouterCsrfAbortError(
			new Error(
				'x-forwarded-host header does not match `origin` header from a forwarded action request. Aborting the action.',
			),
		),
	).toBe(true)
	expect(
		isReactRouterCsrfAbortError(
			new Error('`origin` header is not a valid URL. Aborting the action.'),
		),
	).toBe(true)
	expect(
		isReactRouterCsrfAbortError(
			new Error(
				'`x-forwarded-host` or `host` headers are not provided. One of these is needed to compare the `origin` header from a forwarded action request. Aborting the action.',
			),
		),
	).toBe(true)
	expect(isReactRouterCsrfAbortError(new Error('Aborting the action.'))).toBe(
		false,
	)
	expect(isReactRouterCsrfAbortError('not an error')).toBe(false)
})

test('filters broken fetch monkey-patch crashing React Router (KCD-ZY / KCD-ZX)', () => {
	expect(
		hasInjectedFetchInterceptorBreadcrumbs({
			breadcrumbs: injectedFetchInterceptorBreadcrumbs,
		}),
	).toBe(true)

	expect(
		isBrokenClientFetchContractError({
			exception: {
				values: [
					{
						type: 'TypeError',
						value: "Cannot read properties of undefined (reading 'ok')",
						stacktrace: {
							frames: [
								{
									filename:
										'../../../../../node_modules/react-router/dist/development/chunk-LFPYN7LY.mjs',
									function: 'fetchAndApplyManifestPatches',
								},
							],
						},
					},
				],
			},
			breadcrumbs: injectedFetchInterceptorBreadcrumbs,
		}),
	).toBe(true)

	expect(
		isBrokenClientFetchContractError({
			exception: {
				values: [
					{
						type: 'TypeError',
						value: "Cannot read properties of undefined (reading 'status')",
						stacktrace: {
							frames: [
								{
									filename:
										'../../../../../node_modules/react-router/dist/development/chunk-LFPYN7LY.mjs',
									function: 'fetchAndDecodeViaTurboStream',
								},
							],
						},
					},
				],
			},
			breadcrumbs: injectedFetchInterceptorBreadcrumbs,
		}),
	).toBe(true)

	expect(
		isBrokenClientFetchContractError({
			exception: {
				values: [
					{
						type: 'TypeError',
						value: "Cannot read properties of undefined (reading 'ok')",
						stacktrace: {
							frames: [{ function: 'fetchAndApplyManifestPatches' }],
						},
					},
				],
			},
		}),
	).toBe(false)

	expect(
		isBrokenClientFetchContractError({
			exception: {
				values: [
					{
						type: 'TypeError',
						value: "Cannot read properties of undefined (reading 'ok')",
						stacktrace: {
							frames: [{ function: 'fetchAndApplyManifestPatches' }],
						},
					},
				],
			},
			breadcrumbs: [
				...injectedFetchInterceptorBreadcrumbs,
				...Array.from({ length: 8 }, (_, index) => ({
					category: 'console',
					message: `unrelated console ${index}`,
				})),
			],
		}),
	).toBe(false)

	expect(
		shouldDropSentryEvent({
			exception: {
				values: [
					{
						type: 'TypeError',
						value: "Cannot read properties of undefined (reading 'ok')",
						stacktrace: {
							frames: [{ function: 'fetchAndApplyManifestPatches' }],
						},
					},
				],
			},
			breadcrumbs: injectedFetchInterceptorBreadcrumbs,
		}),
	).toBe(true)
})
