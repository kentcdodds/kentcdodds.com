import { getAuthInfoFromOAuthFromRequest } from '#app/utils/session.server.ts'

export async function requireAuthInfoForMcpRequest(request: Request) {
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
