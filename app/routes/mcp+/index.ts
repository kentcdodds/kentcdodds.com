import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/router'
import { getAuthInfoFromOAuthFromRequest } from '#app/utils/session.server.js'
import { connect, requestStorage } from './mcp.server.ts'

const authTools = ['whoami', 'update_user_info', 'get_recommended_posts']

export async function loader({ request }: LoaderFunctionArgs) {
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined

		const authInfo = await getAuthInfoFromOAuthFromRequest(request)

		const transport = await connect(sessionId)
		return transport.handleRequest(request, authInfo)
	})

	return response
}

export async function action({ request }: ActionFunctionArgs) {
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined

		const authInfo = await getAuthInfoFromOAuthFromRequest(request)

		const transport = await connect(sessionId)
		if (!authInfo) {
			// if it's not a public tool, respond with 401
			const clonedRequest = request.clone()
			const coolTooRequestParsedResult = CallToolRequestSchema.safeParse(
				await clonedRequest.json(),
			)
			if (coolTooRequestParsedResult.success) {
				const toolName = coolTooRequestParsedResult.data.params.name

				if (authTools.includes(toolName)) {
					return new Response('Unauthorized', {
						status: 401,
						headers: {
							'WWW-Authenticate': `Bearer error="unauthorized", error_description="Unauthorized"`,
						},
					})
				}
			}
		}

		return transport.handleRequest(request, authInfo)
	})

	return response
}
