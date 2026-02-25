import { data as json } from 'react-router'
import { type Route } from './+types/cache.sqlite'

export async function action({ request }: Route.ActionArgs) {
	console.warn(
		`Deprecated cache replication endpoint hit: ${request.method} ${request.url}`,
	)
	return json(
		{
			success: false,
			message:
				'Cache replication endpoints are deprecated. Shared cache writes now occur directly through the configured cache backend.',
		},
		{ status: 410 },
	)
}
