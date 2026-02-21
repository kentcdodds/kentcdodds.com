import { redirect } from 'react-router';
import { getAuthInfoFromOAuthFromRequest } from '#app/utils/session.server.js'
import  { type Route } from './+types/index'
import { connect, requestStorage } from './mcp.server.ts'

export async function loader({ request }: Route.LoaderArgs) {
	if (request.headers.get('accept')?.includes('text/html')) {
		throw redirect('/about-mcp')
	}
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined

		// right now, we have to block all requests that are not authenticated
		// Eventually the spec will allow for public tools, but we're not there yet
		const authInfo = await requireAuth(request)

		const transport = await connect(sessionId)
		return transport.handleRequest(request, { authInfo })
	})

	return response
}

export async function action({ request }: Route.ActionArgs) {
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined

		// right now, we have to block all requests that are not authenticated
		// Eventually the spec will allow for public tools, but we're not there yet
		const authInfo = await requireAuth(request)

		const transport = await connect(sessionId)

		return transport.handleRequest(request, { authInfo })
	})

	return response
}

async function requireAuth(request: Request) {
	const authInfo = await getAuthInfoFromOAuthFromRequest(request)
	if (!authInfo) {
		throw new Response('Unauthorized', {
			status: 401,
			headers: {
				'WWW-Authenticate': `Bearer error="unauthorized", error_description="Unauthorized"`,
			},
		})
	}
	return authInfo
}
