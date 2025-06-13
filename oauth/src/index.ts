import { OAuthProvider, type Token } from '@cloudflare/workers-oauth-provider'
import { z } from 'zod'
import { type Env } from './env.d'

export default new OAuthProvider({
	apiRoute: ['/api/'],
	apiHandler: {
		// @ts-expect-error
		async fetch(request: Request, env: Env, ctx: ExecutionContext) {
			const userId = ctx.props?.userId
			if (!userId) return new Response('Unauthorized', { status: 401 })

			const url = new URL(request.url)
			if (url.pathname === '/api/validate-token') {
				const tokenInfo = await getTokenInfo(request, env)
				if (!tokenInfo) return new Response('Unauthorized', { status: 401 })

				return Response.json({
					userId: tokenInfo.userId,
					clientId: tokenInfo.grant.clientId,
					scopes: tokenInfo.grant.scope,
					expiresAt: tokenInfo.expiresAt,
				})
			}
			return new Response('Not found', { status: 404 })
		},
	},
	defaultHandler: {
		// @ts-expect-error
		async fetch(request: Request, env: Env) {
			const url = new URL(request.url)

			if (url.pathname === '/oauth/authorize') {
				// we redirect the authorize URL so we can send it to local if we're running locally
				const newUrl = new URL(request.url)
				if (env.ENVIRONMENT === 'local') {
					newUrl.protocol = 'http:'
					newUrl.host = 'localhost:3000'
				} else {
					newUrl.host = 'kentcdodds.com'
				}

				return Response.redirect(newUrl.toString(), 307)
			}

			if (url.pathname === '/internal/complete-authorization') {
				if (request.method !== 'POST') {
					return new Response('Method not allowed', { status: 405 })
				}

				const authHeader = request.headers.get('authorization')
				const secret = authHeader?.slice('Bearer '.length)
				if (!secret) {
					return new Response('Unauthenticated', { status: 401 })
				}

				if (secret !== env.INTERNAL_SECRET && env.ENVIRONMENT !== 'local') {
					return new Response('Unauthorized', { status: 403 })
				}

				const json = await request.json()
				const parseResult = z
					.object({
						requestParams: z
							.object({
								response_type: z.string().default('code'),
								client_id: z.string(),
								code_challenge: z.string(),
								code_challenge_method: z.string(),
								redirect_uri: z.string(),
								scope: z.string().array().optional().default([]),
								state: z.string().optional().default(''),
							})
							.passthrough()
							.transform(
								({
									response_type: responseType,
									client_id: clientId,
									code_challenge: codeChallenge,
									code_challenge_method: codeChallengeMethod,
									redirect_uri: redirectUri,
									...val
								}) => ({
									responseType,
									clientId,
									codeChallenge,
									codeChallengeMethod,
									redirectUri,
									...val,
								}),
							),
						userId: z.string(),
						props: z.object({ userId: z.string() }),
						metadata: z.unknown(),
					})
					.safeParse(json)
				if (!parseResult.success) {
					return new Response(JSON.stringify(parseResult.error), {
						status: 400,
					})
				}
				const { requestParams, userId, props, metadata } = parseResult.data

				const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
					request: requestParams,
					userId,
					scope: requestParams.scope,
					metadata,
					props: {
						...props,
						scope: requestParams.scope,
						clientId: requestParams.clientId,
					},
				})

				return Response.json({ redirectTo })
			}

			return new Response('Not found', { status: 404 })
		},
	},
	authorizeEndpoint: '/oauth/authorize',
	tokenEndpoint: '/oauth/token',
	clientRegistrationEndpoint: '/oauth/register',
})

async function getTokenInfo(
	request: Request,
	env: Env,
): Promise<Token | undefined> {
	const token = request.headers.get('authorization')?.slice('Bearer '.length)
	if (!token) return undefined
	return resolveTokenInfo(token, env)
}

async function resolveTokenInfo(
	token: string,
	env: Env,
): Promise<Token | undefined> {
	const parts = token.split(':')
	if (parts.length !== 3) throw new Error('Invalid token format')

	const [userId, grantId] = parts
	const tokenId = await generateTokenId(token)
	const tokenKey = `token:${userId}:${grantId}:${tokenId}`

	const tokenData = await env.OAUTH_KV.get(tokenKey, { type: 'json' })
	if (!tokenData) throw new Error('Token not found')

	return tokenData as Token
}

// copied from @cloudflare/workers-oauth-provider
async function generateTokenId(token: string) {
	const encoder = new TextEncoder()
	const data = encoder.encode(token)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
	return hashHex
}
