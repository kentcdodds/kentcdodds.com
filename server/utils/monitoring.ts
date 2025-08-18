import { nodeProfilingIntegration } from '@sentry/profiling-node'
import Sentry from '@sentry/remix'
import { isModernBrowserByUA } from './browser-support.js'

export function init() {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		tunnel: '/lookout',
		environment: process.env.NODE_ENV,
		tracesSampleRate: process.env.NODE_ENV === 'production' ? 1 : 0,
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
		tracesSampler(samplingContext) {
			// ignore healthcheck transactions by other services (consul, etc.)
			if (samplingContext.request?.url?.includes('/healthcheck')) {
				return 0
			}
			return 1
		},
		beforeSendTransaction(event) {
			// ignore all healthcheck related transactions
			//  note that name of header here is case-sensitive
			if (event.request?.headers?.['x-healthcheck'] === 'true') {
				return null
			}

			// Drop transactions from unsupported/old browsers
			const ua = event.request?.headers?.['user-agent']
			if (!isModernBrowserByUA(typeof ua === 'string' ? ua : undefined)) {
				return null
			}

			return event
		},
		ignoreErrors: [
			// Add any other errors you want to ignore
			'Request to /lookout failed',
		],
		beforeSend(event) {
			// Ignore events related to the /lookout endpoint
			if (event.request?.url?.includes('/lookout')) {
				return null
			}

			// Drop events from unsupported/old browsers
			const ua = event.request?.headers?.['user-agent']
			if (!isModernBrowserByUA(typeof ua === 'string' ? ua : undefined)) {
				return null
			}
			return event
		},
	})
}
