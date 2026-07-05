import { OG_CACHE_TTL_SEC, OG_KV_READ_CACHE_TTL_SEC } from './constants.ts'
import { decodePngFromKv, encodePngForKv } from './kv-cache.server.ts'
import { renderOgTemplatePng } from './render.server.ts'
import { verifyOgImageRequest } from './url.server.ts'
import type { OgTemplateName } from './registry.tsx'
import type { OgAssetEnv } from './assets.server.ts'

function readPngDimensions(png: Uint8Array) {
	if (png.length < 24) return { width: 0, height: 0 }
	const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
	const width = view.getUint32(16, false)
	const height = view.getUint32(20, false)
	return { width, height }
}

type OgKvNamespace = {
	get(
		key: string,
		options?: { cacheTtl?: number },
	): Promise<ArrayBuffer | string | null>
	put(
		key: string,
		value: ArrayBuffer | string,
		options?: { expirationTtl?: number },
	): Promise<void>
}

export type OgHandlerEnv = OgAssetEnv & {
	SITE_CACHE_KV?: OgKvNamespace
	OG_IMAGE_SECRET?: string
	ASSETS?: { fetch(request: Request): Response | Promise<Response> }
}

function pngResponse(
	png: Uint8Array,
	{
		cacheStatus,
		width,
		height,
	}: {
		cacheStatus: 'HIT' | 'MISS'
		width: number
		height: number
	},
) {
	const headers = new Headers({
		'content-type': 'image/png',
		'cache-control': 'public, max-age=31536000, immutable',
		'X-Og-Cache': cacheStatus,
		'X-Og-Width': String(width),
		'X-Og-Height': String(height),
	})
	return new Response(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer, {
		status: 200,
		headers,
	})
}

export async function handleOgImageRequest(
	request: Request,
	env: OgHandlerEnv,
) {
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		return new Response('Method not allowed', {
			status: 405,
			headers: { Allow: 'GET, HEAD' },
		})
	}

	const secret = env.OG_IMAGE_SECRET?.trim()
	if (!secret) {
		return new Response(null, { status: 404 })
	}

	const url = new URL(request.url)
	const verified = await verifyOgImageRequest(url.searchParams, secret)
	if (!verified) {
		return new Response(null, { status: 404 })
	}

	const kv = env.SITE_CACHE_KV
	if (kv) {
		const cached = await kv.get(verified.cacheKey, {
			cacheTtl: OG_KV_READ_CACHE_TTL_SEC,
		})
		if (cached) {
			const bytes = decodePngFromKv(cached)
			const { width, height } = readPngDimensions(bytes)
			if (request.method === 'HEAD') {
				return pngResponse(bytes, {
					cacheStatus: 'HIT',
					width,
					height,
				})
			}
			return pngResponse(bytes, {
				cacheStatus: 'HIT',
				width,
				height,
			})
		}
	}

	const { png, width, height } = await renderOgTemplatePng(
		verified.template as OgTemplateName,
		verified.params,
		env,
		env.ASSETS,
		request,
	)

	if (kv) {
		await kv.put(verified.cacheKey, encodePngForKv(png), {
			expirationTtl: OG_CACHE_TTL_SEC,
		})
	}

	if (request.method === 'HEAD') {
		return pngResponse(png, { cacheStatus: 'MISS', width, height })
	}

	return pngResponse(png, { cacheStatus: 'MISS', width, height })
}
