import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import {
  RemixServer as Remix,
  Response,
  Request,
  Headers,
  EntryContext,
} from 'remix'
import {getDataReplayResponse} from './utils/prisma.server'
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

  // TODO: remove this when we go to production
  responseHeaders.set('X-Robots-Tag', 'none')

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
  const replayResponse = await getDataReplayResponse(request, dataResponse)
  if (replayResponse) {
    return replayResponse
  }
  // TODO: remove this when we go to production
  dataResponse.headers.set('X-Robots-Tag', 'none')

  dataResponse.headers.set('X-Powered-By', 'Kody the Koala')
  dataResponse.headers.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown')
  return dataResponse
}
