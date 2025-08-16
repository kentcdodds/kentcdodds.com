import { useLocation, useMatches } from '@remix-run/react'
import {
	init as sentryInit,
	browserTracingIntegration,
	replayIntegration,
	browserProfilingIntegration,
} from '@sentry/remix'
import { useEffect } from 'react'
import { isModernBrowserByUA } from '#app/utils/browser-support.ts'

export function init() {
	sentryInit({
		dsn: ENV.SENTRY_DSN,
		tunnel: '/resources/lookout',
		environment: ENV.MODE,
		ignoreErrors: [
			// Add any other errors you want to ignore
			'Request to /lookout failed',
		],
		beforeSend(event, hint) {
			// Drop events from unsupported/old browsers
			if (
				!isModernBrowserByUA(
					typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
				)
			) {
				return null
			}
			if (isBrowserExtensionError(hint.originalException)) {
				return null
			}
			// Ignore events related to the /lookout endpoint
			if (event.request?.url?.includes('/lookout')) {
				return null
			}
			// Filter out errors related to Google translation service
			if (event.request?.url?.includes('translate-pa.googleapis.com')) {
				return null
			}
			return event
		},
		beforeSendTransaction(event) {
			// Drop transactions from unsupported/old browsers
			if (
				!isModernBrowserByUA(
					typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
				)
			) {
				return null
			}
			return event
		},
		integrations: [
			browserTracingIntegration({
				useEffect,
				useLocation,
				useMatches,
			}),
			replayIntegration(),
			browserProfilingIntegration(),
		],

		// Set tracesSampleRate to 1.0 to capture 100%
		// of transactions for performance monitoring.
		// We recommend adjusting this value in production
		tracesSampleRate: 1.0,

		// Capture Replay for 10% of all sessions,
		// plus for 100% of sessions with an error
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
	})
}

function isBrowserExtensionError(exception: unknown): boolean {
	if (exception instanceof Error && exception.stack) {
		const extensionPattern =
			/chrome-extension:|moz-extension:|extensions|anonymous scripts/
		return extensionPattern.test(exception.stack)
	}

	return false
}
