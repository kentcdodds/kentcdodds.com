import { createMcpServerCard } from '#app/routes/mcp/create-mcp-server-card.server.ts'
import { type Route } from './+types/server-card[.]json'

export async function loader({ request }: Route.LoaderArgs) {
	const data = await createMcpServerCard(request)
	const string = JSON.stringify(data)

	return new Response(string, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Allow-Methods': 'GET',
			'Cache-Control': 'public, max-age=3600',
			'Content-Length': String(Buffer.byteLength(string)),
			'Content-Type': 'application/json',
		},
	})
}
