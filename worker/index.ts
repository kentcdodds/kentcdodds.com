import { createRequestHandler, type AppLoadContext } from 'react-router'
import {
	applyD1Bookmark,
	getD1Bookmark,
	readD1Bookmark,
	withD1Session,
} from '#app/utils/d1-session.server.ts'
import {
	clearRuntimeEnvSource,
	setRuntimeEnvSource,
} from '#app/utils/env.server.ts'
import { runExpiredDataCleanup } from '#app/utils/expired-data-cleanup.server.ts'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'

const primaryHost = 'kentcdodds.com'
const strictTransportSecurity = `max-age=${60 * 60 * 24 * 365 * 100}`

let cachedRequestHandler:
	| ((request: Request, loadContext?: AppLoadContext) => Promise<Response>)
	| null = null

export default {
	async fetch(request: Request, env: Record<string, unknown>, ctx: unknown) {
		const url = new URL(request.url)
		const host = getRequestHost(request)
		const protocol = getRequestProtocol(request, url)
		if (protocol === 'http' && host) {
			return Response.redirect(
				`https://${host}${url.pathname}${url.search}`,
				301,
			)
		}

		if (url.pathname === '/health') {
			return applyStandardResponseHeaders(
				Response.json({ ok: true, runtime: 'cloudflare-worker' }),
				request,
			)
		}

		if (
			env.ASSETS &&
			typeof env.ASSETS === 'object' &&
			'fetch' in env.ASSETS &&
			typeof env.ASSETS.fetch === 'function' &&
			(request.method === 'GET' || request.method === 'HEAD')
		) {
			const assetResponse = await env.ASSETS.fetch(request)
			if (assetResponse.ok) {
				return applyStandardResponseHeaders(assetResponse, request)
			}
		}

		const requestHandler = await getRequestHandler()
		if (!requestHandler) {
			return new Response('Cloudflare worker scaffold is ready.', {
				headers: { 'content-type': 'text/plain; charset=utf-8' },
			})
		}

		const requestBookmark = readD1Bookmark(request)
		const dbSession = withD1Session(env.DB, requestBookmark)
		const requestEnv = dbSession === env.DB ? env : { ...env, DB: dbSession }

		try {
			setRuntimeEnvSource(getStringEnvBindings(requestEnv))
			setRuntimeBindingSource(requestEnv)
			const response = await requestHandler(request, {
				cloudflare: { env: requestEnv, ctx },
			})
			const responseWithBookmark = applyD1Bookmark(
				response,
				getD1Bookmark(dbSession),
			)
			return applyStandardResponseHeaders(responseWithBookmark, request)
		} finally {
			clearRuntimeBindingSource()
			clearRuntimeEnvSource()
		}
	},
	async scheduled(
		controller: { cron: string },
		env: Record<string, unknown>,
	) {
		try {
			setRuntimeEnvSource(getStringEnvBindings(env))
			setRuntimeBindingSource(env)
			await runExpiredDataCleanup({
				reason: `worker-cron:${controller.cron}`,
			})
		} catch (error) {
			console.error('Scheduled cleanup failed', error)
			throw error
		} finally {
			clearRuntimeBindingSource()
			clearRuntimeEnvSource()
		}
	},
}

async function getRequestHandler() {
	if (cachedRequestHandler) return cachedRequestHandler
	try {
		const build = await import('../build/server/index.js')
		cachedRequestHandler = createRequestHandler(build as any, 'production')
		return cachedRequestHandler
	} catch (error) {
		console.warn('Worker request handler unavailable, serving scaffold response.', error)
		return null
	}
}

function getStringEnvBindings(env: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => {
			return typeof entry[1] === 'string'
		}),
	)
}

function getRequestHost(request: Request) {
	return request.headers.get('x-forwarded-host') ?? request.headers.get('host')
}

function getRequestProtocol(request: Request, url: URL) {
	const forwarded = request.headers.get('x-forwarded-proto')
	if (forwarded) return forwarded
	return url.protocol.replace(':', '')
}

function applyStandardResponseHeaders(response: Response, request: Request) {
	const headers = new Headers(response.headers)
	const host = getRequestHost(request)
	const protocol = getRequestProtocol(request, new URL(request.url))
	const originProto = protocol === 'http' ? 'https' : protocol
	if (host) {
		if (!host.endsWith(primaryHost)) {
			headers.set('X-Robots-Tag', 'noindex')
		}
		headers.set('Access-Control-Allow-Origin', `${originProto}://${host}`)
	}
	headers.set('X-Powered-By', 'Kody the Koala')
	headers.set('X-Frame-Options', 'SAMEORIGIN')
	headers.set('Strict-Transport-Security', strictTransportSecurity)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}
