import type { ExecutionContext } from '@cloudflare/workers-types'
import { parseMediaPath } from '../../site/app/utils/media.ts'
import {
	getMediaCacheKey,
	methodNotAllowedMediaResponse,
	notFoundMediaResponse,
	serveMediaRequest,
	type MediaServingEnv,
	type ServeMediaRequestOptions,
} from '../../site/app/utils/media-serving.server.ts'

export type MediaHandlerEnv = MediaServingEnv

export async function handleMediaRequest(
	request: Request,
	env: MediaHandlerEnv,
	ctx: ExecutionContext,
	options: ServeMediaRequestOptions = {},
) {
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		return methodNotAllowedMediaResponse()
	}

	const parsed = parseMediaPath(new URL(request.url).pathname)
	if (!parsed) return notFoundMediaResponse()

	const cache = (globalThis as unknown as { caches?: { default: Cache } })
		.caches?.default
	const cacheKey = getMediaCacheKey(request, parsed.transform)
	// Ranged requests (video seeks) bypass the edge cache: the cache key
	// drops the Range header, so a cached full 200 would be returned with the
	// whole body instead of the requested 206 slice. R2 serves ranges
	// directly instead.
	const rangeHeader = request.headers.get('Range')
	const cached = cache && !rangeHeader ? await cache.match(cacheKey) : undefined
	if (cached) {
		if (request.method === 'HEAD') {
			return new Response(null, {
				status: cached.status,
				headers: cached.headers,
			})
		}
		return cached
	}

	const response = await serveMediaRequest(env, request, parsed, options)
	if (
		cache &&
		response.ok &&
		response.status !== 206 &&
		request.method === 'GET'
	) {
		ctx.waitUntil(cache.put(cacheKey, response.clone()))
	}

	if (request.method === 'HEAD') {
		return new Response(null, {
			status: response.status,
			headers: response.headers,
		})
	}

	return response
}
