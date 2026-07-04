import {
	findOutboundMockRoute,
	type OutboundMockRoute,
} from './outbound-mock-routes.server.ts'
import { maybeHandleCloudflareMockFetch } from './outbound-mock-cloudflare.server.ts'
import { maybeHandleR2MockFetch } from './outbound-mock-r2.server.ts'
import { maybeHandleSearchWorkerMockFetch } from './outbound-mock-search-worker.server.ts'
import { maybeHandleTransistorMockFetch } from './outbound-mock-transistor.server.ts'

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

export type OutboundMockHandlerOptions = {
	onMailgunEmail?: (body: Record<string, string>) => void | Promise<void>
	searchWorkerUrl?: string
	searchWorkerToken?: string
}

export async function handleOutboundMockRoute(
	request: Request,
	url: URL,
	route: OutboundMockRoute,
	options: OutboundMockHandlerOptions = {},
) {
	if (route.host === 'api.mailgun.net') {
		const bodyText = await request.text()
		const body = Object.fromEntries(new URLSearchParams(bodyText))
		if (body.to) {
			await options.onMailgunEmail?.(body)
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

	if (
		route.host === 'www.gravatar.com' &&
		request.method === 'HEAD' &&
		/^\/avatar\/[^/]+$/.test(url.pathname)
	) {
		return new Response(null, { status: 404 })
	}

	return fetch(request)
}

export async function maybeHandleOutboundMockFetch(
	request: Request,
	options: OutboundMockHandlerOptions = {},
) {
	const url = new URL(request.url)

	const searchWorker = await maybeHandleSearchWorkerMockFetch(request, {
		searchWorkerUrl: options.searchWorkerUrl,
		searchWorkerToken: options.searchWorkerToken,
	})
	if (searchWorker) return searchWorker

	const r2 = await maybeHandleR2MockFetch(request)
	if (r2) return r2

	const cloudflare = await maybeHandleCloudflareMockFetch(request)
	if (cloudflare) return cloudflare

	const transistor = await maybeHandleTransistorMockFetch(request)
	if (transistor) return transistor

	const mockRoute = findOutboundMockRoute(request, url)
	if (!mockRoute) return null
	return handleOutboundMockRoute(request, url, mockRoute, options)
}
