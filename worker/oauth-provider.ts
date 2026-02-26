import {
	type OAuthHelpers,
	type TokenSummary,
} from '@cloudflare/workers-oauth-provider'

type OAuthEnv = Record<string, unknown> & {
	OAUTH_PROVIDER?: OAuthHelpers
}

type DefaultHandler = {
	fetch: (
		request: Request,
		env: Record<string, unknown>,
		ctx: unknown,
	) => Promise<Response>
}

export function createWorkerOAuthProvider(defaultHandler: DefaultHandler) {
	return createOAuthProviderRuntime(defaultHandler)
}

async function createOAuthProviderRuntime(defaultHandler: DefaultHandler) {
	const { OAuthProvider } = await import('@cloudflare/workers-oauth-provider')
	return new OAuthProvider({
		apiRoute: ['/api/'],
		apiHandler: {
			async fetch(request: Request, env: Record<string, unknown>) {
				const url = new URL(request.url)
				if (url.pathname !== '/api/validate-token') {
					return jsonResponse({ error: 'Not found' }, 404)
				}

				const token = getBearerToken(request)
				if (!token) {
					return jsonResponse({ error: 'Unauthorized' }, 401)
				}

				const helpers = getOAuthHelpers(env)
				if (!helpers) {
					return jsonResponse({ error: 'OAuth provider unavailable' }, 500)
				}

				const tokenSummary = await helpers.unwrapToken<{
					userId?: unknown
				}>(token)
				if (!tokenSummary) {
					return jsonResponse({ error: 'Unauthorized' }, 401)
				}

				return jsonResponse(buildTokenValidationResponse(tokenSummary), 200)
			},
		},
		defaultHandler: {
			fetch(request: Request, env: Record<string, unknown>, ctx: unknown) {
				return defaultHandler.fetch(request, env, ctx)
			},
		},
		authorizeEndpoint: '/oauth/authorize',
		tokenEndpoint: '/oauth/token',
		clientRegistrationEndpoint: '/oauth/register',
	})
}

function getOAuthHelpers(env: Record<string, unknown>) {
	const candidate = (env as OAuthEnv).OAUTH_PROVIDER
	if (
		candidate &&
		typeof candidate === 'object' &&
		'unwrapToken' in candidate &&
		typeof candidate.unwrapToken === 'function'
	) {
		return candidate
	}
	return null
}

function getBearerToken(request: Request) {
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) return null
	const token = authHeader.slice('Bearer '.length).trim()
	return token.length > 0 ? token : null
}

function buildTokenValidationResponse(
	tokenSummary: TokenSummary<{ userId?: unknown }>,
) {
	const userIdFromProps = tokenSummary.grant?.props?.userId
	const userId =
		typeof userIdFromProps === 'string' && userIdFromProps.length > 0
			? userIdFromProps
			: tokenSummary.userId

	return {
		userId,
		clientId: tokenSummary.grant.clientId,
		scopes: tokenSummary.grant.scope,
		expiresAt: tokenSummary.expiresAt,
	}
}

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	})
}
