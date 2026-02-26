type OAuthHelpers = {
	unwrapToken<T = unknown>(
		token: string,
	): Promise<OAuthTokenSummary<T> | null>
}

type DefaultHandler = {
	fetch: (
		request: Request,
		env: Record<string, unknown>,
		ctx: unknown,
	) => Promise<Response>
}

type OAuthTokenSummary<T = unknown> = {
	userId: string
	expiresAt?: number
	grant: {
		clientId: string
		scope: Array<string>
		props: T
	}
}

type OAuthProviderLike = {
	fetch: (
		request: Request,
		env: Record<string, unknown>,
		ctx: unknown,
	) => Promise<Response>
}

type OAuthProviderModule = {
	OAuthProvider: new (options: {
		apiRoute: Array<string>
		apiHandler: {
			fetch: (request: Request, env: Record<string, unknown>) => Promise<Response>
		}
		defaultHandler: DefaultHandler
		authorizeEndpoint: string
		tokenEndpoint: string
		clientRegistrationEndpoint: string
	}) => OAuthProviderLike
}

let oauthProviderPromise: Promise<OAuthProviderLike | null> | null = null

export function createWorkerOAuthProvider(defaultHandler: DefaultHandler) {
	return {
		async fetch(request: Request, env: Record<string, unknown>, ctx: unknown) {
			const provider = await getOAuthProvider(defaultHandler)
			if (!provider) {
				return defaultHandler.fetch(request, env, ctx)
			}
			return provider.fetch(request, env, ctx)
		},
	}
}

async function getOAuthProvider(defaultHandler: DefaultHandler) {
	if (!oauthProviderPromise) {
		oauthProviderPromise = createOAuthProvider(defaultHandler)
	}
	return oauthProviderPromise
}

async function createOAuthProvider(defaultHandler: DefaultHandler) {
	try {
		const module = (await import(
			'@cloudflare/workers-oauth-provider'
		)) as OAuthProviderModule
		const OAuthProvider = module.OAuthProvider
		return new OAuthProvider({
			apiRoute: ['/api/'],
			apiHandler: {
				async fetch(request, env) {
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

					const tokenSummary = await helpers.unwrapToken<{ userId?: unknown }>(token)
					if (!tokenSummary) {
						return jsonResponse({ error: 'Unauthorized' }, 401)
					}

					return jsonResponse(buildTokenValidationResponse(tokenSummary), 200)
				},
			},
			defaultHandler,
			authorizeEndpoint: '/oauth/authorize',
			tokenEndpoint: '/oauth/token',
			clientRegistrationEndpoint: '/oauth/register',
		})
	} catch (error) {
		console.warn(
			'Unable to initialize workers-oauth-provider; falling back to default handler.',
			error,
		)
		return null
	}
}

function getOAuthHelpers(env: Record<string, unknown>) {
	const candidate = env.OAUTH_PROVIDER
	return isOAuthHelpers(candidate) ? candidate : null
}

function getBearerToken(request: Request) {
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) return null
	const token = authHeader.slice('Bearer '.length).trim()
	return token.length > 0 ? token : null
}

function buildTokenValidationResponse(
	tokenSummary: OAuthTokenSummary<{ userId?: unknown }>,
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

function isOAuthHelpers(value: unknown): value is OAuthHelpers {
	return (
		typeof value === 'object' &&
		value !== null &&
		'unwrapToken' in value &&
		typeof value.unwrapToken === 'function'
	)
}

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	})
}
