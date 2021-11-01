import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import type {EntryContext} from 'remix'
import {RemixServer as Remix} from 'remix'
import {getEnv} from './utils/env.server'
import {routes as otherRoutes} from './other-routes.server'

if (process.env.NODE_ENV === 'development') {
  try {
    require('./refresh.ignored')
  } catch {
    // ignore
  }
}

global.ENV = getEnv()

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  for (const handler of otherRoutes) {
    // eslint-disable-next-line no-await-in-loop
    const otherRouteResponse = await handler(request, remixContext)
    if (otherRouteResponse) return otherRouteResponse
  }

  const markup = ReactDOMServer.renderToString(
    <Remix context={remixContext} url={request.url} />,
  )

  if (process.env.NODE_ENV !== 'production') {
    responseHeaders.set('Cache-Control', 'no-store')
  }

  const html = `<!DOCTYPE html>${markup}`

  responseHeaders.set('Content-Type', 'text/html')
  responseHeaders.set('Content-Length', String(Buffer.byteLength(html)))

  return new Response(html, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}
