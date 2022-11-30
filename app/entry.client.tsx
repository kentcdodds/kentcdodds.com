import './bootstrap.client'
import * as React from 'react'
import {hydrateRoot} from 'react-dom/client'
import {RemixBrowser} from '@remix-run/react'
import {handleDarkAndLightModeEls} from './utils/theme-provider'

// make sure nobody's proxying my site. It happened before:
// https://community.fly.io/t/how-to-deal-with-host-hacking/9092
if (ENV.FLY) {
  const primaryHost = 'kentcdodds.com'
  const allowedHosts = [primaryHost, 'kcd.fly.dev', 'kcd-staging.fly.dev']
  if (!allowedHosts.includes(window.location.host)) {
    window.location.href = `https://${primaryHost}${window.location.pathname}`
  }
}

// fixup stuff before hydration
function hydrate() {
  handleDarkAndLightModeEls()
  React.startTransition(() => {
    hydrateRoot(document, <RemixBrowser />)
  })
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate)
} else {
  window.setTimeout(hydrate, 1)
}
