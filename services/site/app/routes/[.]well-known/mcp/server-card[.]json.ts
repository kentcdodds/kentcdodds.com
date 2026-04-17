import { createMcpServerCard } from '#app/routes/mcp/server-card.ts'
import { type Route } from './+types/server-card[.]json'

export function loader({ request }: Route.LoaderArgs) {
	const data = createMcpServerCard(request)
	const string = JSON.stringify(data)

	return new Response(string, {
		headers: {
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Allow-Methods': 'GET',
			'Cache-Control': 'public, max-age=3600',
			'Content-Length': String(Buffer.byteLength(string)),
			'Content-Type': 'application/json',
		},
	})
}
