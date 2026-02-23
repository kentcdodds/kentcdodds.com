import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'

if (ENV.MODE === 'production' && ENV.SENTRY_DSN) {
	void import('./utils/feature-gate.ts').then(({ hasModernFeatureSet }) => {
		if (hasModernFeatureSet()) {
			void import('./utils/monitoring.client.tsx').then(({ init }) => init())
		}
	})
}

function hydrate() {
	React.startTransition(() => {
		hydrateRoot(document, <HydratedRouter />)
	})
}

if (window.requestIdleCallback) {
	window.requestIdleCallback(hydrate)
} else {
	window.setTimeout(hydrate, 1)
}
