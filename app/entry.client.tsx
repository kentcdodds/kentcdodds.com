import {RemixBrowser} from '@remix-run/react'
import * as React from 'react'
import {hydrateRoot} from 'react-dom/client'
import './bootstrap.client.tsx'
import {handleDarkAndLightModeEls} from './utils/theme-provider.tsx'

// fixup stuff before hydrating
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
