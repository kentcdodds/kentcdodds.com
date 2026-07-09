import { type Route } from './+types/healthcheck'

export async function loader({ request }: Route.LoaderArgs) {
	try {
		// Keep health checks process-local so slow dependencies do not fail
		// otherwise-healthy instances.
		void request
		return new Response('OK')
	} catch (error: unknown) {
		console.error(request.url, 'healthcheck ❌', { error })
		return new Response('ERROR', { status: 500 })
	}
}
