import { type Route } from './+types/healthcheck'

export async function loader({ request }: Route.LoaderArgs) {
	try {
		// Keep health checks process-local so Fly can quickly route around slow
		// dependencies (DB/LiteFS/network) instead of evicting otherwise healthy app instances.
		void request
		return new Response('OK')
	} catch (error: unknown) {
		console.error(request.url, 'healthcheck ❌', { error })
		return new Response('ERROR', { status: 500 })
	}
}
