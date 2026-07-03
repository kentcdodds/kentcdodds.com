import { WorkerEntrypoint } from 'cloudflare:workers'
import { mockRoutes, PASSTHROUGH_HOSTS } from './outbound-mock-routes.ts'
import type { ParentWorkerEnv } from './types.ts'
import { getServiceBindingForHost } from './worker-service-routing.ts'

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

function requiredHeader(headers: Headers, name: string) {
	const value = headers.get(name)
	if (!value) {
		throw new Error(`${name} header is required`)
	}
	return value
}

function requiredParam(params: URLSearchParams, name: string) {
	const value = params.get(name)
	if (!value) {
		throw new Error(`${name} param is required`)
	}
	return value
}

async function handleMockRoute(
	request: Request,
	url: URL,
	env: ParentWorkerEnv,
	route: (typeof mockRoutes)[number],
) {
	if (route.host === 'api.mailgun.net') {
		const bodyText = await request.text()
		const body = Object.fromEntries(new URLSearchParams(bodyText))
		if (body.to) {
			await env.SITE_CACHE_KV.put(
				`preview:last-email:${body.to}`,
				JSON.stringify(body),
			)
		}
		const domain = url.pathname.split('/')[2] ?? 'example.com'
		const randomId = '20210321210543.1.E01B8B612C44B41B'
		return json({
			id: `<${randomId}>@${domain}`,
			message: 'Queued. Thank you.',
		})
	}

	if (route.host === 'api.kit.com' && url.pathname === '/v3/subscribers') {
		return json({
			total_subscribers: 0,
			page: 1,
			total_pages: 1,
			subscribers: [],
		})
	}

	if (
		route.host === 'api.kit.com' &&
		/^\/v3\/subscribers\/[^/]+\/tags$/.test(url.pathname)
	) {
		return json({
			tags: [
				{
					id: 1,
					name: 'Subscribed: general newsletter',
					created_at: '2021-06-09T17:54:22Z',
				},
			],
		})
	}

	if (
		route.host === 'api.kit.com' &&
		request.method === 'POST' &&
		(/^\/v3\/forms\/[^/]+\/subscribe$/.test(url.pathname) ||
			/^\/v3\/tags\/[^/]+\/subscribe$/.test(url.pathname))
	) {
		const body = (await request.json()) as {
			first_name?: string
			email?: string
			fields?: string[]
		}
		const targetId = url.pathname.split('/')[3] ?? '0'
		return json({
			subscription: {
				id: 1234567890,
				state: 'active',
				created_at: new Date().toJSON(),
				source: 'API::V3::SubscriptionsController (external)',
				referrer: null,
				subscribable_id: targetId,
				subscribable_type: url.pathname.includes('/forms/') ? 'form' : 'tag',
				subscriber: {
					id: 987654321,
					first_name: body.first_name ?? 'Test',
					email_address: body.email ?? 'test@example.com',
					state: 'inactive',
					created_at: new Date().toJSON(),
					fields: body.fields ?? [],
				},
			},
		})
	}

	if (route.host === 'discord.com' && url.pathname === '/api/oauth2/token') {
		const body = await request.text()
		if (
			request.headers.get('Content-Type') !==
			'application/x-www-form-urlencoded'
		) {
			return json({ error: 'invalid content type' }, { status: 400 })
		}
		const params = new URLSearchParams(body)
		requiredParam(params, 'client_id')
		requiredParam(params, 'client_secret')
		requiredParam(params, 'grant_type')
		requiredParam(params, 'redirect_uri')
		requiredParam(params, 'scope')
		return json({
			token_type: 'test_token_type',
			access_token: 'test_access_token',
		})
	}

	if (
		route.host === 'discord.com' &&
		/^\/api\/users\/[^/]+$/.test(url.pathname)
	) {
		requiredHeader(request.headers, 'Authorization')
		return json({
			id: 'test_discord_id',
			username: 'test_discord_username',
			discriminator: '0000',
		})
	}

	if (
		route.host === 'discord.com' &&
		/^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname) &&
		request.method === 'GET'
	) {
		requiredHeader(request.headers, 'Authorization')
		const userId = url.pathname.split('/').at(-1) ?? 'test_discord_id'
		const user = {
			id: userId,
			username: `${userId}username`,
			discriminator: '0000',
		}
		return json({
			user,
			roles: [],
			...user,
		})
	}

	if (
		route.host === 'discord.com' &&
		/^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname) &&
		request.method === 'PUT'
	) {
		requiredHeader(request.headers, 'Authorization')
		const body = (await request.json()) as { access_token?: string }
		if (!body?.access_token) {
			return json({ error: 'access_token required' }, { status: 400 })
		}
		return json({})
	}

	if (
		route.host === 'discord.com' &&
		/^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname) &&
		request.method === 'PATCH'
	) {
		requiredHeader(request.headers, 'Authorization')
		const body = (await request.json()) as { roles?: string[] }
		if (!body || !Array.isArray(body.roles) || body.roles.length < 1) {
			return json({ error: 'roles required' }, { status: 400 })
		}
		return json({})
	}

	if (route.host === 'verifyright.co') {
		return json({ status: true })
	}

	return fetch(request)
}

function findMockRoute(request: Request, url: URL) {
	return mockRoutes.find((route) => {
		if (route.host !== url.hostname) return false
		if (route.method && route.method !== request.method) return false
		return route.match(url)
	})
}

export class OutboundProxy extends WorkerEntrypoint<ParentWorkerEnv> {
	async fetch(request: Request) {
		const url = new URL(request.url)

		const serviceBinding = getServiceBindingForHost(url.hostname, this.env)
		if (serviceBinding) {
			return serviceBinding.fetch(request)
		}

		if (PASSTHROUGH_HOSTS.has(url.hostname)) {
			return fetch(request)
		}

		const mockRoute = findMockRoute(request, url)
		if (mockRoute) {
			return handleMockRoute(request, url, this.env, mockRoute)
		}

		return fetch(request)
	}
}

export { PASSTHROUGH_HOSTS } from './outbound-mock-routes.ts'
