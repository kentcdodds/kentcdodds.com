import path from 'path'
import * as React from 'react'
import {json, redirect} from 'remix'
import type {ActionFunction} from 'remix'
import {getRequiredServerEnvVar} from '~/utils/misc'
import {redisCache} from '~/utils/redis.server'
import {getMdxPage} from '~/utils/mdx'
import {getTalksAndTags} from '~/utils/talks.server'
import {getTestimonials} from '~/utils/testimonials.server'
import {getWorkshops} from '~/utils/workshops.server'

export const action: ActionFunction = async ({request}) => {
  if (
    request.headers.get('auth') !==
    getRequiredServerEnvVar('REFRESH_CACHE_SECRET')
  ) {
    return redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  }

  const body = await request.json()
  // fire and forget
  if (body.keys) {
    for (const key of body.keys) {
      void redisCache.del(key)
    }
    return {message: 'Deleting redis cache keys', keys: body.keys}
  }
  if (Array.isArray(body.contentPaths)) {
    const refreshingContentPaths = []
    for (const contentPath of body.contentPaths) {
      if (typeof contentPath !== 'string') continue

      if (contentPath.startsWith('blog') || contentPath.startsWith('pages')) {
        const [contentDir, dirOrFilename] = contentPath.split('/')
        if (!contentDir || !dirOrFilename) continue
        const slug = path.parse(dirOrFilename).name

        refreshingContentPaths.push(contentPath)
        void getMdxPage({contentDir, slug}, {forceFresh: true})
      }
      if (contentPath.startsWith('workshops')) {
        refreshingContentPaths.push(contentPath)
        void getWorkshops({forceFresh: true})
      }
      if (contentPath === 'data/testimonials.yml') {
        refreshingContentPaths.push(contentPath)
        void getTestimonials({forceFresh: true})
      }
      if (contentPath === 'data/talks.yml') {
        refreshingContentPaths.push(contentPath)
        void getTalksAndTags({forceFresh: true})
      }
    }
    return {
      message: 'Refreshing cache for content paths',
      contentPaths: refreshingContentPaths,
    }
  }
  return json({message: 'no action taken'}, {status: 400})
}

export const loader = () => redirect('/', {status: 404})

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
