import path from 'path'
import type {DataFunctionArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {getRequiredServerEnvVar} from '~/utils/misc'
import {cache} from '~/utils/cache.server'
import {getBlogMdxListItems, getMdxDirList, getMdxPage} from '~/utils/mdx'
import {getTalksAndTags} from '~/utils/talks.server'
import {getTestimonials} from '~/utils/testimonials.server'
import {getWorkshops} from '~/utils/workshops.server'
import {getPeople} from '~/utils/credits.server'
import {ensurePrimary} from 'litefs-js/remix'

type Body =
  | {keys: Array<string>; commitSha?: string}
  | {contentPaths: Array<string>; commitSha?: string}

export type RefreshShaInfo = {
  sha: string
  date: string
}

export function isRefreshShaInfo(value: any): value is RefreshShaInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sha' in value &&
    typeof value.sha === 'string' &&
    'date' in value &&
    typeof value.date === 'string'
  )
}

export const commitShaKey = 'meta:last-refresh-commit-sha'

export async function action({request}: DataFunctionArgs) {
  await ensurePrimary()
  // Everything in this function is fire and forget, so we don't need to await
  // anything.
  if (
    request.headers.get('auth') !==
    getRequiredServerEnvVar('REFRESH_CACHE_SECRET')
  ) {
    return redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  }

  const body = (await request.json()) as Body

  function setShaInCache() {
    const {commitSha: sha} = body
    if (sha) {
      const value: RefreshShaInfo = {sha, date: new Date().toISOString()}
      cache.set(commitShaKey, {
        value,
        metadata: {
          createdTime: new Date().getTime(),
          swr: Number.MAX_SAFE_INTEGER,
          ttl: Number.MAX_SAFE_INTEGER,
        },
      })
    }
  }

  if ('keys' in body && Array.isArray(body.keys)) {
    for (const key of body.keys) {
      void cache.delete(key)
    }
    setShaInCache()
    return json({
      message: 'Deleting cache keys',
      keys: body.keys,
      commitSha: body.commitSha,
    })
  }
  if ('contentPaths' in body && Array.isArray(body.contentPaths)) {
    const refreshingContentPaths = []
    for (const contentPath of body.contentPaths) {
      if (typeof contentPath !== 'string') {
        continue
      }

      if (contentPath.startsWith('blog') || contentPath.startsWith('pages')) {
        const [contentDir, dirOrFilename] = contentPath.split('/')
        if (!contentDir || !dirOrFilename) {
          continue
        }
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
      if (contentPath === 'data/credits.yml') {
        refreshingContentPaths.push(contentPath)
        void getPeople({forceFresh: true})
      }
    }

    // if any blog contentPaths were changed then let's update the dir list
    // so it will appear on the blog page.
    if (refreshingContentPaths.some(p => p.startsWith('blog'))) {
      void getBlogMdxListItems({
        request,
        forceFresh: 'blog:dir-list,blog:mdx-list-items',
      })
    }
    if (refreshingContentPaths.some(p => p.startsWith('pages'))) {
      void getMdxDirList('pages', {forceFresh: true})
    }

    setShaInCache()
    return json({
      message: 'Refreshing cache for content paths',
      contentPaths: refreshingContentPaths,
      commitSha: body.commitSha,
    })
  }
  return json({message: 'no action taken'}, {status: 400})
}

export const loader = () => redirect('/', {status: 404})
