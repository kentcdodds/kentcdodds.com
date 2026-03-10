import {
	HttpResponse,
	http,
	type DefaultBodyType,
	type HttpHandler,
	type DefaultRequestMultipartBody,
} from 'msw'
import { requiredHeader, requiredParam } from './utils.ts'

const discordHandlers: Array<HttpHandler> = [
	http.post<any, DefaultRequestMultipartBody>(
		'https://discord.com/api/oauth2/token',
		async ({ request }) => {
			const body = await request.text()
			if (typeof body !== 'string') {
				throw new Error('request body must be a string of URLSearchParams')
			}
			if (
				request.headers.get('Content-Type') !==
				'application/x-www-form-urlencoded'
			) {
				throw new Error(
					'Content-Type header must be "application/x-www-form-urlencoded"',
				)
			}
			const params = new URLSearchParams(body)
			requiredParam(params, 'client_id')
			requiredParam(params, 'client_secret')
			requiredParam(params, 'grant_type')
			requiredParam(params, 'redirect_uri')
			requiredParam(params, 'scope')
			return HttpResponse.json({
				token_type: 'test_token_type',
				access_token: 'test_access_token',
			})
		},
	),

	http.get<any, DefaultBodyType>(
		'https://discord.com/api/users/:userId',
		async ({ request }) => {
			requiredHeader(request.headers, 'Authorization')
			return HttpResponse.json({
				id: 'test_discord_id',
				username: 'test_discord_username',
				discriminator: '0000',
			})
		},
	),

	http.get<any, DefaultBodyType>(
		'https://discord.com/api/guilds/:guildId/members/:userId',
		async ({ request, params }) => {
			requiredHeader(request.headers, 'Authorization')
			const user = {
				id: params.userId,
				username: `${params.userId}username`,
				discriminator: '0000',
			}
			return HttpResponse.json({
				user,
				roles: [],
				...user,
			})
		},
	),

	http.put<any, DefaultBodyType>(
		'https://discord.com/api/guilds/:guildId/members/:userId',
		async ({ request }) => {
			requiredHeader(request.headers, 'Authorization')
			const body = await request.json()
			if (typeof body !== 'object') {
				console.error('Request body:', body)
				throw new Error('Request body must be a JSON object')
			}
			if (!body?.access_token) {
				const bodyString = JSON.stringify(body, null, 2)
				throw new Error(
					`access_token required in the body, but not found in ${bodyString}`,
				)
			}
			return HttpResponse.json({
				// We don't use this response for now so we'll leave this empty
			})
		},
	),

	http.patch<any, DefaultBodyType>(
		'https://discord.com/api/guilds/:guildId/members/:userId',
		async ({ request }) => {
			requiredHeader(request.headers, 'Authorization')
			const body = await request.json()
			if (typeof body !== 'object') {
				throw new Error('patch request to member must have a JSON body')
			}
			if (!body || !Array.isArray(body.roles) || body.roles.length < 1) {
				throw new Error(
					'patch request to member must include a roles array with the new role',
				)
			}
			return HttpResponse.json({
				// We don't use this response for now so we'll leave this empty
			})
		},
	),

	http.get<any, DefaultBodyType>(
		'https://discord.com/api/guilds/:guildId/members/:userId',
		async ({ request }) => {
			requiredHeader(request.headers, 'Authorization')
			return HttpResponse.json({
				user: { id: 'test_discord_id', username: 'test_username' },
				roles: [],
			})
		},
	),

	http.post<any, DefaultBodyType>(
		'https://discord.com/api/channels/:channelId/messages',
		async ({ request, params }) => {
			requiredHeader(request.headers, 'Authorization')
			const body = await request.json()
			if (typeof body !== 'object') {
				console.error('Request body:', body)
				throw new Error('Request body must be a JSON object')
			}

			console.log(
				`🤖 Sending bot message to ${params.channelId}:\n`,
				body?.content,
			)

			return HttpResponse.json({
				/* we ignore the response */
			})
		},
	),
]

export { discordHandlers }
