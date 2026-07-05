/// <reference types="@cloudflare/workers-types" />

import {
	type MediaTransform,
	type ParsedMediaRequest,
	buildMediaUrl,
	mediaKeyCandidates,
} from './media.ts'

export type ImagesBinding = {
	input(
		stream: ReadableStream<Uint8Array>,
		options?: { encoding?: 'base64' },
	): ImageTransformer
}

type ImageTransformer = {
	transform(transform: ImageTransformOptions): ImageTransformer
	output(options: ImageOutputOptions): Promise<ImageTransformationResult>
}

type ImageTransformOptions = {
	width?: number
	height?: number
	background?: string
	blur?: number
	fit?: 'scale-down' | 'contain' | 'pad' | 'cover'
	gravity?: 'auto' | 'left' | 'right' | 'top' | 'bottom'
}

type ImageOutputOptions = {
	format:
		| 'image/jpeg'
		| 'image/png'
		| 'image/gif'
		| 'image/webp'
		| 'image/avif'
	quality?: number
}

type ImageTransformationResult = {
	response(): Response
	contentType(): string
}

export type MediaServingEnv = {
	MEDIA_BUCKET: R2Bucket
	IMAGES: ImagesBinding
}

export type MediaObjectMeta = {
	contentType?: string
	size?: number
	etag?: string
}

export type MediaObjectSource = MediaObjectMeta & {
	body: ReadableStream<Uint8Array>
}

export const MEDIA_CACHE_CONTROL_IMMUTABLE =
	'public, max-age=31536000, immutable' as const
export const MEDIA_CACHE_CONTROL_NOT_FOUND = 'public, max-age=60' as const

export const PRODUCTION_MEDIA_ORIGIN =
	'https://kentcdodds-com.kentcdodds.workers.dev'
// The staging fallback matters only until the production worker (with the
// /media route) is deployed from main; it can be dropped with the staging
// decommission (issue #815).
export const STAGING_MEDIA_ORIGIN =
	'https://kentcdodds-com-staging.kentcdodds.workers.dev'

const MAX_DIMENSION = 4096
const MAX_BLUR = 250
const MAGIC_BYTE_COUNT = 16

export function isMp4Magic(bytes: Uint8Array) {
	return (
		bytes.length >= 8 &&
		bytes[4] === 0x66 &&
		bytes[5] === 0x74 &&
		bytes[6] === 0x79 &&
		bytes[7] === 0x70
	)
}

export function sniffImageContentType(bytes: Uint8Array): string | null {
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg'
	}
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return 'image/png'
	}
	if (
		bytes.length >= 6 &&
		bytes[0] === 0x47 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x38
	) {
		return 'image/gif'
	}
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return 'image/webp'
	}
	if (isSvgMagic(bytes)) {
		return 'image/svg+xml'
	}
	return null
}

/** SVG sources start with `<svg` or an XML prolog (`<?xml`). */
export function isSvgMagic(bytes: Uint8Array) {
	if (bytes.length < 5) return false
	const head = String.fromCharCode(...bytes.slice(0, 5)).toLowerCase()
	return head.startsWith('<svg') || head.startsWith('<?xml')
}

export function isSvgContent({
	contentType,
	magic,
}: {
	contentType?: string
	magic?: Uint8Array
}) {
	if (contentType?.toLowerCase().includes('image/svg')) return true
	if (magic && isSvgMagic(magic)) return true
	return false
}

export function sniffImageOutputFormat(
	bytes: Uint8Array,
): ImageOutputOptions['format'] {
	const contentType = sniffImageContentType(bytes)
	switch (contentType) {
		case 'image/jpeg':
			return 'image/jpeg'
		case 'image/png':
			return 'image/png'
		case 'image/gif':
			return 'image/gif'
		case 'image/webp':
			return 'image/webp'
		default:
			return 'image/jpeg'
	}
}

export function isGifContentType(contentType: string | undefined) {
	return contentType?.toLowerCase().includes('image/gif') ?? false
}

export function isVideoContent({
	contentType,
	id,
	magic,
}: {
	contentType?: string
	id: string
	magic?: Uint8Array
}) {
	if (contentType?.toLowerCase().startsWith('video/')) return true
	if (id.toLowerCase().endsWith('.mp4')) return true
	if (magic && isMp4Magic(magic)) return true
	return false
}

export function hasTransformValues(transform: MediaTransform | undefined) {
	if (!transform) return false
	return Boolean(
		transform.width ||
			transform.height ||
			transform.aspectRatio ||
			transform.fit ||
			transform.gravity ||
			transform.background ||
			transform.blur ||
			transform.quality ||
			transform.format,
	)
}

export function validateMediaTransform(
	transform: MediaTransform | undefined,
): { ok: true } | { ok: false; error: string } {
	if (!transform) return { ok: true }
	if (transform.width && transform.width > MAX_DIMENSION) {
		return { ok: false, error: 'width exceeds maximum of 4096' }
	}
	if (transform.height && transform.height > MAX_DIMENSION) {
		return { ok: false, error: 'height exceeds maximum of 4096' }
	}
	if (transform.blur && transform.blur > MAX_BLUR) {
		return { ok: false, error: 'blur exceeds maximum of 250' }
	}
	return { ok: true }
}

export function mapMediaGravity(gravity: string | undefined) {
	if (!gravity) return undefined
	// Cloudflare Images ignores 'face'; map to saliency-based 'auto'.
	if (gravity === 'face') return 'auto' as const
	return gravity as ImageTransformOptions['gravity']
}

export function normalizeBackgroundColor(background: string) {
	if (background.startsWith('#')) return background
	if (/^[0-9a-fA-F]{3,8}$/.test(background)) return `#${background}`
	return background
}

function acceptPrefers(acceptHeader: string | null, mediaType: string) {
	if (!acceptHeader) return false
	return acceptHeader
		.split(',')
		.some((part) => part.trim().split(';')[0]?.trim() === mediaType)
}

export function resolveOutputFormat({
	transform,
	acceptHeader,
	isGif,
	originalFormat,
}: {
	transform: MediaTransform | undefined
	acceptHeader: string | null
	isGif: boolean
	originalFormat: ImageOutputOptions['format']
}): { format: ImageOutputOptions['format']; negotiated: boolean } {
	const requested = transform?.format
	if (requested && requested !== 'auto') {
		return {
			format: `image/${requested}` as ImageOutputOptions['format'],
			negotiated: false,
		}
	}

	if (acceptPrefers(acceptHeader, 'image/avif')) {
		return { format: 'image/avif', negotiated: true }
	}
	if (acceptPrefers(acceptHeader, 'image/webp')) {
		return { format: 'image/webp', negotiated: true }
	}
	if (isGif) {
		return { format: 'image/gif', negotiated: false }
	}
	return { format: originalFormat, negotiated: false }
}

export function buildImageTransformOptions(
	transform: MediaTransform,
): ImageTransformOptions {
	const options: ImageTransformOptions = {}
	if (transform.width) options.width = transform.width
	if (transform.height) options.height = transform.height
	if (transform.fit) options.fit = transform.fit
	const gravity = mapMediaGravity(transform.gravity)
	if (gravity) options.gravity = gravity
	if (transform.background) {
		options.background = normalizeBackgroundColor(transform.background)
	}
	if (transform.blur) {
		options.blur = Math.min(MAX_BLUR, Math.max(1, transform.blur))
	}
	return options
}

export async function findR2ObjectHead(bucket: R2Bucket, id: string) {
	for (const key of mediaKeyCandidates(id)) {
		const head = await bucket.head(key)
		if (head) return { head, key }
	}
	return null
}

export async function readR2MagicBytes(bucket: R2Bucket, key: string) {
	const object = await bucket.get(key, {
		range: { offset: 0, length: MAGIC_BYTE_COUNT },
	})
	if (!object) return new Uint8Array()
	return new Uint8Array(await object.arrayBuffer())
}

export function r2ObjectToSource(object: R2ObjectBody): MediaObjectSource {
	return {
		body: object.body,
		size: object.size,
		contentType: object.httpMetadata?.contentType,
		etag: object.etag,
	}
}

function resolveContentType(
	meta: MediaObjectMeta,
	magic?: Uint8Array,
	fallback = 'application/octet-stream',
) {
	const metadataType = meta.contentType
	if (metadataType && metadataType !== 'application/octet-stream') {
		return metadataType
	}
	if (magic) {
		const sniffed = sniffImageContentType(magic)
		if (sniffed) return sniffed
		if (isMp4Magic(magic)) return 'video/mp4'
	}
	return fallback
}

function parseByteRange(
	rangeHeader: string | null,
	size: number,
): { offset: number; length: number } | null {
	if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null
	const spec = rangeHeader.slice('bytes='.length).trim()
	if (!spec || spec.includes(',')) return null

	if (spec.startsWith('-')) {
		const suffix = Number.parseInt(spec.slice(1), 10)
		if (!Number.isFinite(suffix) || suffix <= 0) return null
		const length = Math.min(suffix, size)
		return { offset: Math.max(0, size - length), length }
	}

	const [startText, endText] = spec.split('-')
	const start = Number.parseInt(startText ?? '', 10)
	if (!Number.isFinite(start) || start < 0) return null
	if (endText === undefined || endText === '') {
		return { offset: start, length: Math.max(0, size - start) }
	}
	const end = Number.parseInt(endText, 10)
	if (!Number.isFinite(end) || end < start) return null
	return { offset: start, length: end - start + 1 }
}

export async function serveVideoResponse({
	source,
	request,
}: {
	source: MediaObjectSource
	request: Request
}) {
	const size = source.size ?? 0
	const range = parseByteRange(request.headers.get('Range'), size)
	const contentType = resolveContentType(source, undefined, 'video/mp4')

	if (range && size > 0) {
		const start = range.offset
		const length = range.length
		const end = start + length - 1
		const headers = new Headers({
			'content-type': contentType,
			'cache-control': MEDIA_CACHE_CONTROL_IMMUTABLE,
			'accept-ranges': 'bytes',
			'content-range': `bytes ${start}-${end}/${size}`,
			'content-length': String(length),
		})
		if (request.method === 'HEAD') {
			return new Response(null, { status: 206, headers })
		}
		return new Response(source.body, { status: 206, headers })
	}

	const headers = new Headers({
		'content-type': contentType,
		'cache-control': MEDIA_CACHE_CONTROL_IMMUTABLE,
		'accept-ranges': 'bytes',
	})
	if (size > 0) headers.set('content-length', String(size))
	if (source.etag) headers.set('etag', source.etag)

	if (request.method === 'HEAD') {
		return new Response(null, { status: 200, headers })
	}
	return new Response(source.body, { status: 200, headers })
}

export async function serveOriginalImageResponse({
	source,
	request,
	magic,
}: {
	source: MediaObjectSource
	request: Request
	magic?: Uint8Array
}) {
	const contentType = resolveContentType(source, magic, 'image/jpeg')
	const headers = new Headers({
		'content-type': contentType,
		'cache-control': MEDIA_CACHE_CONTROL_IMMUTABLE,
	})
	if (source.size) headers.set('content-length', String(source.size))
	if (source.etag) headers.set('etag', source.etag)

	if (request.method === 'HEAD') {
		return new Response(null, { status: 200, headers })
	}
	return new Response(source.body, { status: 200, headers })
}

export async function serveTransformedImageResponse({
	env,
	source,
	transform,
	request,
	magic,
}: {
	env: MediaServingEnv
	source: MediaObjectSource
	transform: MediaTransform
	request: Request
	magic?: Uint8Array
}) {
	const isGif =
		isGifContentType(source.contentType) ||
		sniffImageContentType(magic ?? new Uint8Array()) === 'image/gif'
	const originalFormat = sniffImageOutputFormat(magic ?? new Uint8Array())
	const { format, negotiated } = resolveOutputFormat({
		transform,
		acceptHeader: request.headers.get('Accept'),
		isGif,
		originalFormat,
	})

	const outputOptions: ImageOutputOptions = { format }
	if (transform.quality) {
		outputOptions.quality = Math.min(100, Math.max(1, transform.quality))
	}

	const result = await env.IMAGES.input(source.body)
		.transform(buildImageTransformOptions(transform))
		.output(outputOptions)

	const response = result.response()
	const headers = new Headers(response.headers)
	headers.set('cache-control', MEDIA_CACHE_CONTROL_IMMUTABLE)
	headers.set('content-type', result.contentType())
	if (negotiated) headers.set('vary', 'Accept')

	if (request.method === 'HEAD') {
		return new Response(null, { status: response.status, headers })
	}
	return new Response(response.body, { status: response.status, headers })
}

export async function serveMediaObject({
	env,
	source,
	id,
	transform,
	request,
	magic,
}: {
	env: MediaServingEnv
	source: MediaObjectSource
	id: string
	transform: MediaTransform | undefined
	request: Request
	magic?: Uint8Array
}) {
	const video = isVideoContent({
		contentType: source.contentType,
		id,
		magic,
	})

	if (video) {
		return serveVideoResponse({ source, request })
	}

	// SVG sources scale losslessly in the browser and the Images binding
	// cannot rasterize them; serve the original regardless of transform.
	if (isSvgContent({ contentType: source.contentType, magic })) {
		return serveOriginalImageResponse({ source, request, magic })
	}

	if (!hasTransformValues(transform)) {
		return serveOriginalImageResponse({ source, request, magic })
	}

	return serveTransformedImageResponse({
		env,
		source,
		transform: transform ?? {},
		request,
		magic,
	})
}

export function notFoundMediaResponse() {
	return new Response('Not found', {
		status: 404,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': MEDIA_CACHE_CONTROL_NOT_FOUND,
		},
	})
}

export function methodNotAllowedMediaResponse() {
	return new Response('Method not allowed', {
		status: 405,
		headers: { Allow: 'GET, HEAD' },
	})
}

export function badRequestMediaResponse(message: string) {
	return new Response(message, {
		status: 400,
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	})
}

export function needsFormatNegotiation(transform: MediaTransform | undefined) {
	if (!hasTransformValues(transform)) return false
	const format = transform?.format
	return !format || format === 'auto'
}

/**
 * The Workers Cache API does not honor `Vary: Accept`, so the negotiated
 * format class must be part of the cache-key URL itself. All clients within
 * the same Accept class (avif > webp > base) share one cached variant.
 */
export function getMediaAcceptClass(acceptHeader: string | null) {
	if (acceptPrefers(acceptHeader, 'image/avif')) return 'avif'
	if (acceptPrefers(acceptHeader, 'image/webp')) return 'webp'
	return 'base'
}

export function getMediaCacheKey(request: Request, transform: MediaTransform | undefined) {
	if (!needsFormatNegotiation(transform)) {
		return new Request(request.url, { method: 'GET' })
	}
	const url = new URL(request.url)
	url.searchParams.set(
		'__accept',
		getMediaAcceptClass(request.headers.get('Accept')),
	)
	return new Request(url.toString(), { method: 'GET' })
}

export type ServeMediaRequestOptions = {
	/** Tried in order until one returns the asset (dev-only proxying). */
	fallbackOrigins?: Array<string>
}

export async function serveMediaRequest(
	env: MediaServingEnv,
	request: Request,
	parsed: ParsedMediaRequest,
	options: ServeMediaRequestOptions = {},
) {
	const validation = validateMediaTransform(parsed.transform)
	if (!validation.ok) {
		return badRequestMediaResponse(validation.error)
	}

	const headResult = await findR2ObjectHead(env.MEDIA_BUCKET, parsed.id)
	if (headResult) {
		const { head, key } = headResult
		const contentType = head.httpMetadata?.contentType
		const needsMagic =
			!contentType ||
			contentType === 'application/octet-stream' ||
			(!contentType.startsWith('video/') &&
				!contentType.startsWith('image/') &&
				!parsed.id.toLowerCase().endsWith('.mp4'))
		const magic = needsMagic
			? await readR2MagicBytes(env.MEDIA_BUCKET, key)
			: undefined
		const video = isVideoContent({
			contentType,
			id: parsed.id,
			magic,
		})
		const range = video
			? parseByteRange(request.headers.get('Range'), head.size)
			: null
		const object = await env.MEDIA_BUCKET.get(
			key,
			range ? { range: { offset: range.offset, length: range.length } } : undefined,
		)
		if (!object) return notFoundMediaResponse()

		return serveMediaObject({
			env,
			source: r2ObjectToSource(object),
			id: parsed.id,
			transform: video ? undefined : parsed.transform,
			request,
			magic,
		})
	}

	for (const fallbackOrigin of options.fallbackOrigins ?? []) {
		const fallbackUrl = buildMediaUrl(parsed.id, undefined, {
			origin: fallbackOrigin,
		})
		const fallbackResponse = await fetch(fallbackUrl, {
			headers: request.headers.get('Range')
				? { Range: request.headers.get('Range')! }
				: undefined,
		})
		if (!fallbackResponse.ok || !fallbackResponse.body) {
			continue
		}

		if (hasTransformValues(parsed.transform)) {
			// Proxy the fully-transformed asset. The local (miniflare) Images
			// binding is a low-fidelity simulator (e.g. `fit: cover` letterboxes
			// instead of cropping), so remote transforms keep dev output
			// faithful to production. Buffer the body: streaming a remote
			// response through workerd can abort mid-flight under parallel
			// image load, which surfaces as a dev-server "fetch failed" 500.
			await fallbackResponse.body.cancel()
			const transformedUrl = buildMediaUrl(parsed.id, parsed.transform, {
				origin: fallbackOrigin,
			})
			const transformedResponse = await fetch(transformedUrl, {
				headers: request.headers.get('Accept')
					? { Accept: request.headers.get('Accept')! }
					: undefined,
			})
			if (!transformedResponse.ok) return notFoundMediaResponse()
			const bytes = await transformedResponse.arrayBuffer()
			const headers = new Headers({
				'content-type':
					transformedResponse.headers.get('content-type') ??
					'application/octet-stream',
				'content-length': String(bytes.byteLength),
				'cache-control': MEDIA_CACHE_CONTROL_IMMUTABLE,
			})
			const vary = transformedResponse.headers.get('vary')
			if (vary) headers.set('vary', vary)
			if (request.method === 'HEAD') {
				return new Response(null, { status: 200, headers })
			}
			return new Response(bytes, { status: 200, headers })
		}

		const contentType =
			fallbackResponse.headers.get('content-type') ?? undefined
		const isVideo = isVideoContent({ contentType, id: parsed.id })
		if (isVideo) {
			// Stream video (potentially large) but drop upstream framing
			// headers; the runtime re-frames the proxied stream itself.
			const headers = new Headers({
				'cache-control': MEDIA_CACHE_CONTROL_IMMUTABLE,
				'accept-ranges': 'bytes',
			})
			if (contentType) headers.set('content-type', contentType)
			const contentRange = fallbackResponse.headers.get('content-range')
			if (contentRange) headers.set('content-range', contentRange)
			if (request.method === 'HEAD') {
				return new Response(null, {
					status: fallbackResponse.status,
					headers,
				})
			}
			return new Response(fallbackResponse.body, {
				status: fallbackResponse.status,
				headers,
			})
		}

		const bytes = await fallbackResponse.arrayBuffer()
		const headers = new Headers({
			'content-type': contentType ?? 'application/octet-stream',
			'content-length': String(bytes.byteLength),
			'cache-control': MEDIA_CACHE_CONTROL_IMMUTABLE,
		})
		if (request.method === 'HEAD') {
			return new Response(null, { status: 200, headers })
		}
		return new Response(bytes, { status: 200, headers })
	}

	return notFoundMediaResponse()
}
