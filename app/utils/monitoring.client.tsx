import { useLocation, useMatches } from '@remix-run/react'
import {
	init as sentryInit,
	browserTracingIntegration,
	replayIntegration,
	browserProfilingIntegration,
} from '@sentry/remix'
import { useEffect } from 'react'

export function init() {
	sentryInit({
		dsn: ENV.SENTRY_DSN,
		environment: ENV.MODE,
		beforeSend(event, hint) {
			if (isBrowserExtensionError(hint.originalException)) {
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
