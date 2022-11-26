import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import cookie from 'cookie'
import type {EntryContext, HandleDataRequestFunction} from '@remix-run/node'
import {RemixServer as Remix} from '@remix-run/react'
import {getEnv} from './utils/env.server'
import {routes as otherRoutes} from './other-routes.server'
import {getFlyReplayResponse, getInstanceInfo} from './utils/fly.server'
import invariant from 'tiny-invariant'
import fs from 'fs'
import path from 'path'
import {getServerTimeHeader, time} from './utils/timing.server'

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
    const {currentIsPrimary, primaryInstance} = await getInstanceInfo()
    if (!currentIsPrimary) {
      console.error(
        `Replaying request in ${process.env.FLY_REGION} to primary instance (${primaryInstance}) because of error`,
      )
      return getFlyReplayResponse(primaryInstance)
    }
  }

  for (const handler of otherRoutes) {
    // eslint-disable-next-line no-await-in-loop
    const otherRouteResponse = await handler(request, remixContext)
    if (otherRouteResponse) return otherRouteResponse
  }

  const timings = {}
  const markup = await time(
    () => {
      return ReactDOMServer.renderToString(
        <Remix context={remixContext} url={request.url} />,
      )
    },
    {timings, type: 'react rendering', desc: 'renderToString'},
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
  responseHeaders.append('Server-Timing', getServerTimeHeader(timings))

  return new Response(html, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}

export async function handleDataRequest(
  response: Response,
  {request}: Parameters<HandleDataRequestFunction>[1],
) {
  const {currentIsPrimary, primaryInstance} = await getInstanceInfo()
  if (response.status >= 500) {
    // maybe we're just in trouble in this instance... if we're not in the primary
    // instance, then replay and hopefully it works next time.
    if (!currentIsPrimary) {
      console.error(
        `Replaying request in ${process.env.FLY_REGION} to primary instance (${primaryInstance}) because of error`,
      )
      return getFlyReplayResponse(primaryInstance)
    }
  }

  if (request.method === 'POST') {
    if (currentIsPrimary) {
      const txnum = getTXNumber()
      if (txnum) {
        response.headers.append(
          'Set-Cookie',
          cookie.serialize('txnum', txnum.toString(), {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
          }),
        )
      }
    }
  }

  return response
}

function getTXNumber() {
  if (!process.env.FLY) return 0

  const {FLY_LITEFS_DIR, DATABASE_FILENAME} = process.env
  invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
  invariant(DATABASE_FILENAME, 'DATABASE_FILENAME is not defined')
  let dbPos = '0'
  try {
    dbPos = fs.readFileSync(
      path.join(FLY_LITEFS_DIR, `${DATABASE_FILENAME}-pos`),
      'utf-8',
    )
  } catch {
    // ignore
  }
  return parseInt(dbPos.trim().split('/')[0] ?? '0', 16)
}
