import path from 'path'
import { data as json, redirect } from 'react-router'
import { cache } from '#app/utils/cache.server.ts'
import { getPeople } from '#app/utils/credits.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import {
	getBlogMdxListItems,
	getMdxDirList,
	getMdxPage,
} from '#app/utils/mdx.server.ts'
import { getResumeData } from '#app/utils/resume.server.ts'
import { getTalksAndTags } from '#app/utils/talks.server.ts'
import { getTestimonials } from '#app/utils/testimonials.server.ts'
import { type Route } from './+types/refresh-cache'

type Body =
	| { keys: Array<string>; commitSha?: string }
	| { contentPaths: Array<string>; commitSha?: string }

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

export async function action({ request }: Route.ActionArgs) {
	if (request.headers.get('auth') !== getEnv().REFRESH_CACHE_SECRET) {
		return redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
	}

	const body = (await request.json()) as Body

	function setShaInCache() {
		const { commitSha: sha } = body
		if (sha) {
			const value: RefreshShaInfo = { sha, date: new Date().toISOString() }
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
		const promises = []
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
				promises.push(getMdxPage({ contentDir, slug }, { forceFresh: true }))
			}
			if (contentPath === 'data/testimonials.yml') {
				refreshingContentPaths.push(contentPath)
				promises.push(getTestimonials({ forceFresh: true }))
			}
			if (contentPath === 'data/talks.yml') {
				refreshingContentPaths.push(contentPath)
				promises.push(getTalksAndTags({ forceFresh: true }))
			}
			if (contentPath === 'data/resume.yml') {
				refreshingContentPaths.push(contentPath)
				promises.push(getResumeData({ forceFresh: true }))
			}
			if (contentPath === 'data/credits.yml') {
				refreshingContentPaths.push(contentPath)
				promises.push(getPeople({ forceFresh: true }))
			}
		}

		// if any blog contentPaths were changed then let's update the dir list
		// so it will appear on the blog page.
		if (refreshingContentPaths.some((p) => p.startsWith('blog'))) {
			promises.push(
				getBlogMdxListItems({
					request,
					forceFresh: 'blog:dir-list,blog:mdx-list-items',
				}),
			)
		}
		if (refreshingContentPaths.some((p) => p.startsWith('pages'))) {
			promises.push(getMdxDirList('pages', { forceFresh: true }))
		}

		if (promises.length) {
			await Promise.all(promises)
		}

		setShaInCache()
		return json({
			message: 'Refreshing cache for content paths',
			contentPaths: refreshingContentPaths,
			commitSha: body.commitSha,
		})
	}
	return json({ message: 'no action taken' }, { status: 400 })
}

export const loader = () => redirect('/', { status: 404 })
