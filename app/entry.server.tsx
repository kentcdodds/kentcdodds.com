import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import type {Request, Headers, EntryContext} from 'remix'
import {RemixServer as Remix} from 'remix'
import {getRssFeedXml} from './utils/blog-rss-feed.server'
import {getEnv} from './utils/env.server'

global.ENV = getEnv()

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const {pathname} = new URL(request.url)
  if (pathname === '/blog/rss.xml') {
    return new Response(await getRssFeedXml(request), {
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  }

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
