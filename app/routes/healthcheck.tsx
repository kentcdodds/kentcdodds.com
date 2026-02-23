import { prisma } from '#app/utils/prisma.server.ts'
import { type Route } from './+types/healthcheck'

export async function loader({ request }: Route.LoaderArgs) {
	try {
		// Minimal check: DB connectivity. Heavy checks (getBlogReadRankings, self-fetch)
		// were causing 5s Fly healthcheck timeouts under load.
		await prisma.user.count()
		return new Response('OK')
	} catch (error: unknown) {
		console.error(request.url, 'healthcheck ❌', { error })
		return new Response('ERROR', { status: 500 })
	}
}
