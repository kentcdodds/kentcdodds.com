import {
	init as sentryInit,
	reactRouterTracingIntegration,
	replayIntegration,
	browserProfilingIntegration,
} from '@sentry/react-router'

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
			return event
		},
		integrations: [
			reactRouterTracingIntegration(),
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
