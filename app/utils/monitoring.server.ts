import { nodeProfilingIntegration } from '@sentry/profiling-node'
import Sentry from '@sentry/remix'

export function init() {
	Sentry.init({
		dsn: ENV.SENTRY_DSN,
		environment: ENV.MODE,
		tracesSampleRate: ENV.MODE === 'production' ? 1 : 0,
		denyUrls: [
			/\/healthcheck/,
			// TODO: be smarter about the public assets...
			/\/build\//,
			/\/favicons\//,
			/\/images\//,
			/\/fonts\//,
			/\/apple-touch-.*/,
			/\/robots.txt/,
			/\/favicon.ico/,
			/\/site\.webmanifest/,
		],
		integrations: [
			Sentry.httpIntegration(),
			Sentry.prismaIntegration(),
			nodeProfilingIntegration(),
		],
		beforeSendTransaction(event) {
			// ignore all healthcheck related transactions
			if (event.request?.headers?.['X-Healthcheck'] === 'true') return null

			return event
		},
	})
}
