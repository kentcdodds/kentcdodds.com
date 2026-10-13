import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { installReactRouterDataProtocolFetchFailureTracker } from './utils/react-router-data-protocol-network.ts'
import { installSiteWebMcpTools } from './web-mcp.client.ts'

// Before hydrate (and before async Sentry init): record `.data` / `__manifest`
// network TypeErrors so SPA-nav hard-reload works when Vite minifies RR names
// out of Error.stack (KCD-10N).
installReactRouterDataProtocolFetchFailureTracker()

if (ENV.MODE === 'production' && ENV.SENTRY_DSN) {
	void import('./utils/feature-gate.ts').then(({ hasModernFeatureSet }) => {
		if (hasModernFeatureSet()) {
			void import('./utils/monitoring.client.tsx').then(({ init }) => init())
		}
	})
}

installSiteWebMcpTools()

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
