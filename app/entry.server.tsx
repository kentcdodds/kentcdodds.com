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
    // @ts-expect-error this is... odd... I think it's a bug with the experimental version
    <Remix context={remixContext} url={request.url} />,
  )

  if (process.env.NODE_ENV !== 'production') {
    responseHeaders.set('Cache-Control', 'no-store')
  }

  const html = `<!DOCTYPE html>${markup}`

  responseHeaders.set('X-Powered-By', 'Kody the Koala')
  responseHeaders.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown')
  responseHeaders.set('Content-Type', 'text/html')
  responseHeaders.set('Content-Length', String(Buffer.byteLength(html)))

  return new Response(html, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}

// This isn't supported yet. We're using patch-package to make this work:
// https://github.com/remix-run/remix/issues/217
export async function handleDataRequest(
  request: Request,
  dataResponse: Response,
) {
  dataResponse.headers.set('X-Powered-By', 'Kody the Koala')
  dataResponse.headers.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown')
  return dataResponse
}
