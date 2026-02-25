import { redirect } from 'react-router'
import { type Route } from './+types/index'
import { requireAuthInfoForMcpRequest } from './mcp-auth.server.ts'
import { connect } from './mcp.server.ts'

export async function loader({ request }: Route.LoaderArgs) {
	if (request.headers.get('accept')?.includes('text/html')) {
		throw redirect('/about-mcp')
	}
	const sessionId = request.headers.get('mcp-session-id') ?? undefined

	// right now, we have to block all requests that are not authenticated
	// Eventually the spec will allow for public tools, but we're not there yet
	const authInfo = await requireAuthInfoForMcpRequest(request)

	const transport = await connect({ request, sessionId })
	const response = await transport.handleRequest(request, { authInfo })

	return response
}

export async function action({ request }: Route.ActionArgs) {
	const sessionId = request.headers.get('mcp-session-id') ?? undefined

	// right now, we have to block all requests that are not authenticated
	// Eventually the spec will allow for public tools, but we're not there yet
	const authInfo = await requireAuthInfoForMcpRequest(request)

	const transport = await connect({ request, sessionId })
	const response = await transport.handleRequest(request, { authInfo })

	return response
}
