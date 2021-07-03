import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import type {EntryContext} from 'remix'
import {RemixServer as Remix} from 'remix'
import {getEnv} from './utils/env.server'

Object.assign(global, {ENV: getEnv()})

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const markup = ReactDOMServer.renderToString(
    <Remix context={remixContext} url={request.url} />,
  )

  if (process.env.NODE_ENV !== 'production') {
    responseHeaders.set('Cache-Control', 'no-store')
  }

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: {
      // TODO: remove this when we go to production
      'X-Robots-Tag': 'none',
      ...Object.fromEntries(responseHeaders),
      'X-Powered-By': 'Kody the Koala',
      'Content-Type': 'text/html',
    },
  })
}
