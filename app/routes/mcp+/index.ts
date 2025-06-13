import { type AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/router'
import { z } from 'zod'
import { connect, requestStorage } from './mcp.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined

		const authInfo = await getAuthInfoFromRequest(request)

		const transport = await connect(sessionId)
		return transport.handleRequest(request, authInfo)
	})

	return response
}

export async function action({ request }: ActionFunctionArgs) {
	const response = await requestStorage.run(request, async () => {
		const sessionId = request.headers.get('mcp-session-id') ?? undefined

		const authInfo = await getAuthInfoFromRequest(request)

		const transport = await connect(sessionId)

		return transport.handleRequest(request, authInfo)
	})

	return response
}

async function getAuthInfoFromRequest(
	request: Request,
): Promise<AuthInfo | undefined> {
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) return undefined
	const token = authHeader.slice('Bearer '.length)

	const validateUrl =
		'https://kcd-oauth-provider.kentcdodds.workers.dev/api/validate-token'
	const resp = await fetch(validateUrl, {
		headers: { authorization: `Bearer ${token}` },
	})
	if (!resp.ok) return undefined
	const data = z
		.object({
			userId: z.string(),
			clientId: z.string().default(''),
			scopes: z.array(z.string()).default([]),
			expiresAt: z.number().optional(),
		})
		.parse(await resp.json())
	const { userId, clientId, scopes, expiresAt } = data

	return {
		token,
		clientId,
		scopes,
		expiresAt,
		extra: { userId },
	}
}
