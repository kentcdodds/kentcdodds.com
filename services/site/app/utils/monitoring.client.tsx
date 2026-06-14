import {
	init as sentryInit,
	reactRouterTracingIntegration,
} from '@sentry/react-router'

export function init() {
	sentryInit({
		dsn: ENV.SENTRY_DSN,
		tunnel: '/resources/lookout',
		environment: ENV.MODE,
		ignoreErrors: [
			// Add any other errors you want to ignore
			'Request to /lookout failed',
			"Can't find variable: CONFIG",
			'CONFIG is not defined',
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
		integrations: [reactRouterTracingIntegration()],

		// Set tracesSampleRate to 1.0 to capture 100%
		// of transactions for performance monitoring.
		// We recommend adjusting this value in production
		tracesSampleRate: 0.01,

		// Keep error reporting on while avoiding replay/profiling load during incidents.
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 0,
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
