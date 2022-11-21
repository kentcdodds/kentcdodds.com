import type {DataFunctionArgs} from '@remix-run/node'
import {prisma} from '~/utils/prisma.server'
import {getBlogReadRankings} from '~/utils/blog.server'

export async function loader({request}: DataFunctionArgs) {
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')

  try {
    await Promise.all([
      prisma.user.count(),
      getBlogReadRankings({request}),
      fetch(`http://${host}`, {method: 'HEAD'}).then(r => {
        if (!r.ok) return Promise.reject(r)
      }),
    ])
    return new Response('OK')
  } catch (error: unknown) {
    console.log(request.url, 'healthcheck ❌', {error})
    return new Response('ERROR', {status: 500})
  }
}
