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

let cachedRequestHandler:
	| ((request: Request, loadContext?: AppLoadContext) => Promise<Response>)
	| null = null

export default {
	async fetch(request: Request, env: Record<string, unknown>, ctx: unknown) {
		const url = new URL(request.url)
		if (url.pathname === '/health') {
			return Response.json({ ok: true, runtime: 'cloudflare-worker' })
		}

		if (
			env.ASSETS &&
			typeof env.ASSETS === 'object' &&
			'fetch' in env.ASSETS &&
			typeof env.ASSETS.fetch === 'function' &&
			(request.method === 'GET' || request.method === 'HEAD')
		) {
			const assetResponse = await env.ASSETS.fetch(request)
			if (assetResponse.ok) return assetResponse
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
			const response = await requestHandler(request, {
				cloudflare: { env: requestEnv, ctx },
			})
			return applyD1Bookmark(response, getD1Bookmark(dbSession))
		} finally {
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
