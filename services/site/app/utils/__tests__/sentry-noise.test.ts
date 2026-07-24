import { expect, test } from 'vitest'
import {
	SENTRY_DENY_URLS,
	SENTRY_IGNORE_ERRORS,
	isBrowserExtensionError,
	isDegradedUiPerformanceEvent,
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

test('filters EIP-1193 wallet user rejection (KCD-ZV)', () => {
	expect(
		matchesIgnoreError(
			'Non-Error promise rejection captured with value: user rejected the request',
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

test('detects browser extension stacks and denyUrls', () => {
	const extensionError = new Error('boom')
	extensionError.stack =
		'Error: boom\n    at chrome-extension://abc/content.js:1:1'
	expect(isBrowserExtensionError(extensionError)).toBe(true)
	expect(matchesDenyUrl('chrome-extension://abc/content.js')).toBe(true)
	expect(matchesDenyUrl('moz-extension://abc/content.js')).toBe(true)
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
