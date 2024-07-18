import { type LoaderFunctionArgs } from '@remix-run/node'
import { getBlogReadRankings } from '#app/utils/blog.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const host =
		request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')

	try {
		await Promise.all([
			prisma.user.count(),
			getBlogReadRankings({ request }),
			fetch(`${new URL(request.url).protocol}${host}`, {
				method: 'HEAD',
				headers: { 'x-healthcheck': 'true' },
			}).then((r) => {
				if (!r.ok) return Promise.reject(r)
			}),
		])
		return new Response('OK')
	} catch (error: unknown) {
		console.error(request.url, 'healthcheck ❌', { error })
		return new Response('ERROR', { status: 500 })
	}
}
