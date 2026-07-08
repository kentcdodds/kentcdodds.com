import { data as json, redirect } from 'react-router'
import { cache } from '#app/utils/cache.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { type Route } from './+types/refresh-cache'

type Body =
	| { keys: Array<string>; commitSha?: string }
	| { commitSha: string }

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

	async function setShaInCache() {
		const { commitSha: sha } = body
		if (sha) {
			const value: RefreshShaInfo = { sha, date: new Date().toISOString() }
			await cache.set(commitShaKey, {
				value,
				metadata: {
					createdTime: new Date().getTime(),
					swr: 0,
					ttl: Infinity,
				},
			})
		}
	}

	if ('keys' in body && Array.isArray(body.keys)) {
		for (const key of body.keys) {
			await cache.delete(key)
		}
		await setShaInCache()
		return json({
			message: 'Deleting cache keys',
			keys: body.keys,
			commitSha: body.commitSha,
		})
	}
	if ('commitSha' in body && typeof body.commitSha === 'string') {
		await setShaInCache()
		return json({
			message: 'Recorded commit SHA',
			commitSha: body.commitSha,
		})
	}
	return json({ message: 'no action taken' }, { status: 400 })
}

export const loader = () => redirect('/', { status: 404 })
