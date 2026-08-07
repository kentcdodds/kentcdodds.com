import { redirect } from 'react-router'
import { getAuthInfoFromOAuthFromRequest } from '#app/utils/session.server.js'
import { type Route } from './+types/index'
import { getMcpRuntime } from './mcp-lazy.server.ts'

export async function loader({ request }: Route.LoaderArgs) {
	if (request.headers.get('accept')?.includes('text/html')) {
		throw redirect('/about-mcp')
	}
	// right now, we have to block all requests that are not authenticated
	// Eventually the spec will allow for public tools, but we're not there yet.
	// Auth runs before getMcpRuntime so unauthenticated traffic never triggers
	// the deferred MCP SDK evaluation.
	const authInfo = await requireAuth(request)

	const { requestStorage, connect } = await getMcpRuntime()
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined
		const transport = await connect(sessionId)
		return transport.handleRequest(request, { authInfo })
	})

	return response
}

export async function action({ request }: Route.ActionArgs) {
	// right now, we have to block all requests that are not authenticated
	// Eventually the spec will allow for public tools, but we're not there yet.
	// Auth runs before getMcpRuntime so unauthenticated traffic never triggers
	// the deferred MCP SDK evaluation.
	const authInfo = await requireAuth(request)

	const { requestStorage, connect } = await getMcpRuntime()
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined
		const transport = await connect(sessionId)

		return transport.handleRequest(request, { authInfo })
	})

	return response
}

async function requireAuth(request: Request) {
	const authInfo = await getAuthInfoFromOAuthFromRequest(request)
	if (!authInfo) {
		const resourceMetadataUrl = new URL(
			'/.well-known/oauth-protected-resource/mcp',
			request.url,
		)
		throw new Response('Unauthorized', {
			status: 401,
			headers: {
				'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataUrl}", error="unauthorized", error_description="Unauthorized"`,
			},
		})
	}
	return authInfo
}
