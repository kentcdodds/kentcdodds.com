import { data as json } from 'react-router'
import {
	appendApiCatalogHeaders,
	getAgentApiCatalog,
} from '#app/utils/agent-discovery.ts'
import { type Route } from './+types/api-catalog'

export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers({
		'Cache-Control': 'public, max-age=3600',
		'Content-Type':
			'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
	})
	appendApiCatalogHeaders(headers)

	return json(getAgentApiCatalog(request), { headers })
}
