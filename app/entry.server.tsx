import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import type {EntryContext} from '@remix-run/node'
import {RemixServer as Remix} from '@remix-run/react'
import {getEnv} from './utils/env.server'
import {routes as otherRoutes} from './other-routes.server'
import {getRequiredServerEnvVar} from './utils/misc'

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
  if (responseStatusCode >= 500) {
    // maybe we're just in trouble in this region... if we're not in the primary
    // region, then replay and hopefully it works next time.
    const FLY_REGION = getRequiredServerEnvVar('FLY_REGION')
    if (FLY_REGION !== ENV.PRIMARY_REGION) {
      return new Response('Fly Replay', {
        status: 409,
        headers: {'fly-replay': `region=${ENV.PRIMARY_REGION}`},
      })
    }
  }

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
  responseHeaders.append(
    'Link',
    '<https://res.cloudinary.com>; rel="preconnect"',
  )

  return new Response(html, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}

export function handleDataRequest(response: Response) {
  if (response.status >= 500) {
    // maybe we're just in trouble in this region... if we're not in the primary
    // region, then replay and hopefully it works next time.
    const FLY_REGION = getRequiredServerEnvVar('FLY_REGION')
    if (FLY_REGION !== ENV.PRIMARY_REGION) {
      return new Response('Fly Replay', {
        status: 409,
        headers: {'fly-replay': `region=${ENV.PRIMARY_REGION}`},
      })
    }
  }
  return response
}
