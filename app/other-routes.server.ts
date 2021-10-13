import {EntryContext, json} from 'remix'
import {getSitemapXml} from './utils/sitemap.server'
import {getRssFeedXml} from './utils/blog-rss-feed.server'
import {getAllUserData, prismaRead} from './utils/prisma.server'
import {commitShaKey as refreshCacheCommitShaKey} from './routes/action/refresh-cache'
import {redisCache} from './utils/redis.server'
import {requireUser} from './utils/session.server'
import {getUserInfo} from './utils/user-info.server'
import {getBlogReadRankings, getPostJson} from './utils/blog.server'

type Handler = (
  request: Request,
  remixContext: EntryContext,
) => Promise<Response | null> | null

// Just made it this way to make it easier to check for handled routes in
// our `routes/$slug.tsx` catch-all route.
const pathedRoutes: Record<string, Handler> = {
  '/refresh-commit-sha.json': async () => {
    const shaInfo = await redisCache.get(refreshCacheCommitShaKey)
    const data = JSON.stringify(shaInfo)
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(data)),
      },
    })
  },
  '/blog.json': async request => {
    const data = await getPostJson(request)
    const string = JSON.stringify(data)
    return new Response(string, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(string)),
      },
    })
  },
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
  '/me/download.json': async request => {
    const user = await requireUser(request)

    const postgres = await getAllUserData(user.id)
    const cache = await getUserInfo(user)
    return json({postgres, cache})
  },
  '/healthcheck': async request => {
    try {
      const userCount = await prismaRead.user.count()
      const rankings = await getBlogReadRankings({request})
      console.log('healthcheck ✅', {
        userCount,
        rankings: rankings.map(r => ({
          team: r.team,
          totalReads: r.totalReads,
          ranking: r.ranking,
        })),
      })
      return new Response('OK')
    } catch (error: unknown) {
      console.log('healthcheck ❌', {error})
      return new Response('ERROR', {status: 500})
    }
  },
}

const routes: Array<Handler> = [
  ...Object.entries(pathedRoutes).map(([path, handler]) => {
    return (request: Request, remixContext: EntryContext) => {
      if (new URL(request.url).pathname !== path) return null

      return handler(request, remixContext)
    }
  }),
]

export {routes, pathedRoutes}
