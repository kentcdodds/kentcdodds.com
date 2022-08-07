import './bootstrap.client'
import * as React from 'react'
import {hydrateRoot} from 'react-dom/client'
import {load} from 'fathom-client'
import {RemixBrowser} from '@remix-run/react'
import {handleDarkAndLightModeEls} from './utils/theme-provider'
// fixup stuff before hydration

function hydrate() {
  handleDarkAndLightModeEls()
  React.startTransition(() => {
    hydrateRoot(
      document,
      <React.StrictMode>
        <RemixBrowser />
      </React.StrictMode>,
    )
  })

  if (ENV.NODE_ENV !== 'development') {
    load('HJUUDKMT', {
      url: 'https://sailfish.kentcdodds.com/script.js',
      spa: 'history',
      // canonical URLs don't change during client-side navigation, so if Fathom relied on them
      // it would only be able to track initially loaded pages and full refreshes
      canonical: false,
      excludedDomains: ['localhost'],
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate)
} else {
  window.setTimeout(hydrate, 1)
}
