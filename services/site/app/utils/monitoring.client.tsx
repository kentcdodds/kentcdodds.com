import {
	init as sentryInit,
	reactRouterTracingIntegration,
} from '@sentry/react-router'
import {
	SENTRY_DENY_URLS,
	SENTRY_IGNORE_ERRORS,
	shouldDropSentryEvent,
} from './sentry-noise.ts'

export function init() {
	sentryInit({
		dsn: ENV.SENTRY_DSN,
		tunnel: '/resources/lookout',
		environment: ENV.MODE,
		ignoreErrors: SENTRY_IGNORE_ERRORS,
		denyUrls: SENTRY_DENY_URLS,
		beforeSend(event, hint) {
			if (shouldDropSentryEvent(event, hint)) {
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
