import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import {
  RemixServer as Remix,
  Response,
  Request,
  Headers,
  EntryContext,
} from 'remix'
import {
  getDocumentReplayResponse,
  getDataReplayResponse,
} from './utils/prisma.server'
import {getRssFeedXml} from './utils/blog-rss-feed.server'
import {getEnv} from './utils/env.server'
import {sendEventWithRequestContext} from './utils/sentry.server'

global.ENV = getEnv()

const startTime = Date.now()

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const replayResponse = await getDocumentReplayResponse(request, remixContext)
  if (replayResponse) {
    return replayResponse
  }
  const {pathname} = new URL(request.url)
  if (pathname === '/build-info') {
    const buildInfo = {
      commit: ENV.COMMIT_SHA,
      startTime,
    }
    const json = JSON.stringify(buildInfo)
    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(json)),
      },
    })
  }
  if (pathname === '/blog/rss.xml') {
    const rss = await getRssFeedXml(request)
    return new Response(rss, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': String(Buffer.byteLength(rss)),
      },
    })
  }

  const markup = ReactDOMServer.renderToString(
    <Remix context={remixContext} url={request.url} />,
  )

  if (process.env.NODE_ENV !== 'production') {
    responseHeaders.set('Cache-Control', 'no-store')
  }

  if (responseStatusCode >= 400) {
    sendEventWithRequestContext(
      request,
      new Error(
        `Document ${request.method} request to ${request.url} resulted in a ${responseStatusCode}`,
      ),
      () => ({
        tags: {
          type: 'handleDocumentRequest',
          responseStatus: responseStatusCode,
        },
      }),
    )
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
  if (dataResponse.status >= 400) {
    sendEventWithRequestContext(
      request,
      new Error(
        `Data ${request.method} request to ${request.url} resulted in a ${dataResponse.status}`,
      ),
      () => ({
        tags: {
          type: 'handleDataRequest',
          responseStatus: dataResponse.status,
        },
      }),
    )
  }
  // TODO: remove this when we go to production
  dataResponse.headers.set('X-Robots-Tag', 'none')

  dataResponse.headers.set('X-Powered-By', 'Kody the Koala')
  dataResponse.headers.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown')
  return dataResponse
}
