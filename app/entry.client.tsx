import { RemixBrowser } from '@remix-run/react'
import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'

if (ENV.MODE === 'production' && ENV.SENTRY_DSN) {
	void import('./utils/monitoring.client.tsx').then(({ init }) => init())
}

function hydrate() {
	React.startTransition(() => {
		hydrateRoot(document, <RemixBrowser />)
	})
}

if (window.requestIdleCallback) {
	window.requestIdleCallback(hydrate)
} else {
	window.setTimeout(hydrate, 1)
}
