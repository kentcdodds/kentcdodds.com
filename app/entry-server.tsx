import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import type {EntryContext} from '@remix-run/core'
import Remix from '@remix-run/react/server'
import {ThemeProvider} from './theme-provider'

import App from './app'

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const markup = ReactDOMServer.renderToString(
    <Remix context={remixContext} url={request.url}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Remix>,
  )

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: {
      ...Object.fromEntries(responseHeaders),
      'Content-Type': 'text/html',
    },
  })
}
