import type {Request, EntryContext} from 'remix'
import {Response} from 'remix'
import {getSitemapXml} from './utils/sitemap.server'
import {getRssFeedXml} from './utils/blog-rss-feed.server'
import {getDocumentReplayResponse} from './utils/prisma.server'

type Handler = (
  request: Request,
  remixContext: EntryContext,
) => Promise<Response | null> | null

// Just made it this way to make it easier to check for handled routes in
// our `routes/$slug.tsx` catch-all route.
const pathedRoutes: Record<string, Handler> = {
  '/blog/rss.xml': async request => {
    const rss = await getRssFeedXml(request)
    return new Response(rss, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': String(Buffer.byteLength(rss)),
      },
    })
  },
  '/sitemap.xml': async (request, remixContext) => {
    const sitemap = await getSitemapXml(request, remixContext)
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': String(Buffer.byteLength(sitemap)),
      },
    })
  },
}

const routes: Array<Handler> = [
  getDocumentReplayResponse,
  ...Object.entries(pathedRoutes).map(([path, handler]) => {
    return (request: Request, remixContext: EntryContext) => {
      if (new URL(request.url).pathname !== path) return null

      return handler(request, remixContext)
    }
  }),
]

export {routes, pathedRoutes}
