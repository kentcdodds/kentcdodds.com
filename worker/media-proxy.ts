import { resolveMediaImageId } from '#app/utils/media-manifest-resolver.ts'

const defaultCloudflareImagesDeliveryBaseUrl =
	'https://imagedelivery.net/-P7RfnLm6GMsEkkSxgg7ZQ'

export async function maybeHandleMediaProxyRequest(
	request: Request,
	env: Record<string, unknown>,
) {
	if (!isMediaProxyRequest(request)) return null

	const url = new URL(request.url)
	const requestedImageId = decodeURIComponent(url.pathname.slice('/images/'.length))
	if (!requestedImageId) {
		return new Response('Image id is required', { status: 400 })
	}

	const resolvedImageId = resolveMediaImageId(requestedImageId)
	const sourceUrl = buildImageSourceUrl({
		requestedImageId,
		resolvedImageId,
		env,
	})

	const transformOptions = parseTransformOptions(url.searchParams.get('tr'))
	const transformedResponse = await fetchCloudflareImage({
		method: request.method,
		sourceUrl,
		transformOptions,
	})
	if (transformedResponse?.ok) {
		return buildMediaProxyResponse(transformedResponse, request.method)
	}

	const untransformedResponse = await fetchCloudflareImage({
		method: request.method,
		sourceUrl,
		transformOptions: null,
	})
	if (untransformedResponse?.ok) {
		return buildMediaProxyResponse(untransformedResponse, request.method)
	}

	const mediaBaseProxyResponse = await fetchFromMediaBase({
		request,
		env,
	})
	if (mediaBaseProxyResponse?.ok) {
		return buildMediaProxyResponse(mediaBaseProxyResponse, request.method)
	}

	return null
}

function isMediaProxyRequest(request: Request) {
	if (!(request.method === 'GET' || request.method === 'HEAD')) return false
	const pathname = new URL(request.url).pathname
	return pathname.startsWith('/images/')
}

function getCloudflareImagesDeliveryBaseUrl(env: Record<string, unknown>) {
	const explicitBaseUrl =
		readStringBinding(env.MEDIA_IMAGES_DELIVERY_BASE_URL) ??
		readStringBinding(env.MEDIA_IMAGES_DELIVERY_BASE) ??
		readStringBinding(process.env.MEDIA_IMAGES_DELIVERY_BASE_URL)
	return (explicitBaseUrl || defaultCloudflareImagesDeliveryBaseUrl).replace(
		/\/+$/,
		'',
	)
}

function getMediaBaseUrl(env: Record<string, unknown>) {
	const explicitBaseUrl =
		readStringBinding(env.MEDIA_BASE_URL) ??
		readStringBinding(process.env.MEDIA_BASE_URL)
	return (explicitBaseUrl || 'https://media.kcd.dev').replace(/\/+$/, '')
}

function readStringBinding(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function buildCloudflareImagesDeliveryUrl({
	baseUrl,
	imageId,
}: {
	baseUrl: string
	imageId: string
}) {
	const normalizedId = imageId
		.replace(/^\/+/, '')
		.split('/')
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join('/')
	return `${baseUrl}/${normalizedId}/public`
}

function buildImageSourceUrl({
	requestedImageId,
	resolvedImageId,
	env,
}: {
	requestedImageId: string
	resolvedImageId: string
	env: Record<string, unknown>
}) {
	const unsplashPath = resolveUnsplashPath(requestedImageId, resolvedImageId)
	if (unsplashPath) {
		const normalizedPath = unsplashPath
			.replace(/^\/+/, '')
			.split('/')
			.filter(Boolean)
			.map((segment) => encodeURIComponent(segment))
			.join('/')
		return `https://images.unsplash.com/${normalizedPath}`
	}

	const deliveryBaseUrl = getCloudflareImagesDeliveryBaseUrl(env)
	return buildCloudflareImagesDeliveryUrl({
		baseUrl: deliveryBaseUrl,
		imageId: resolvedImageId,
	})
}

function resolveUnsplashPath(requestedImageId: string, resolvedImageId: string) {
	for (const candidate of [requestedImageId, resolvedImageId]) {
		if (!candidate.toLowerCase().startsWith('unsplash/')) continue
		const unsplashPath = candidate.slice('unsplash/'.length)
		if (unsplashPath) return unsplashPath
	}
	return null
}

function parseTransformOptions(tr: string | null) {
	if (!tr) return null
	const options: Record<string, unknown> = {}
	const parts = tr
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)

	for (const part of parts) {
		const [key, ...valueParts] = part.split('_')
		const rawValue = valueParts.join('_')
		if (!key || !rawValue) continue

		if (key === 'w' || key === 'h' || key === 'q') {
			const numericValue = Number(rawValue)
			if (!Number.isFinite(numericValue) || numericValue <= 0) continue
			if (key === 'w') options.width = Math.round(numericValue)
			if (key === 'h') options.height = Math.round(numericValue)
			if (key === 'q') options.quality = Math.min(100, Math.round(numericValue))
			continue
		}

		if (key === 'f') {
			const normalizedFormat = rawValue.toLowerCase()
			if (normalizedFormat === 'auto') continue
			if (
				normalizedFormat === 'avif' ||
				normalizedFormat === 'webp' ||
				normalizedFormat === 'png' ||
				normalizedFormat === 'jpeg' ||
				normalizedFormat === 'jpg'
			) {
				options.format =
					normalizedFormat === 'jpg' ? 'jpeg' : normalizedFormat
			}
			continue
		}

		if (key === 'c') {
			const normalizedCrop = rawValue.toLowerCase()
			const fit =
				normalizedCrop === 'fill'
					? 'cover'
					: normalizedCrop === 'pad'
						? 'pad'
						: normalizedCrop === 'crop'
							? 'crop'
							: normalizedCrop === 'scale'
								? 'scale-down'
								: null
			if (fit) options.fit = fit
			continue
		}

		if (key === 'ar') {
			const ratioMatch = rawValue.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
			if (!ratioMatch) continue
			const widthRatio = Number(ratioMatch[1])
			const heightRatio = Number(ratioMatch[2])
			if (
				!Number.isFinite(widthRatio) ||
				!Number.isFinite(heightRatio) ||
				widthRatio <= 0 ||
				heightRatio <= 0
			) {
				continue
			}

			const currentWidth =
				typeof options.width === 'number' ? options.width : null
			const currentHeight =
				typeof options.height === 'number' ? options.height : null
			if (currentWidth && !currentHeight) {
				options.height = Math.round((currentWidth * heightRatio) / widthRatio)
			} else if (currentHeight && !currentWidth) {
				options.width = Math.round((currentHeight * widthRatio) / heightRatio)
			}
		}
	}

	return Object.keys(options).length > 0 ? options : null
}

async function fetchFromMediaBase({
	request,
	env,
}: {
	request: Request
	env: Record<string, unknown>
}) {
	try {
		const baseUrl = getMediaBaseUrl(env)
		const requestUrl = new URL(request.url)
		const proxyUrl = new URL(
			`${baseUrl}${requestUrl.pathname}${requestUrl.search}`,
		)
		return await fetch(new Request(proxyUrl, { method: request.method }))
	} catch {
		return null
	}
}

async function fetchCloudflareImage({
	method,
	sourceUrl,
	transformOptions,
}: {
	method: string
	sourceUrl: string
	transformOptions: Record<string, unknown> | null
}) {
	try {
		const requestInit: RequestInit & {
			cf?: {
				image?: Record<string, unknown>
			}
		} = {
			method,
		}
		if (transformOptions) {
			requestInit.cf = {
				image: transformOptions,
			}
		}
		return await fetch(new Request(sourceUrl, { method }), requestInit)
	} catch {
		return null
	}
}

function buildMediaProxyResponse(response: Response, method: string) {
	const headers = new Headers(response.headers)
	headers.set('cross-origin-resource-policy', 'cross-origin')
	headers.set('access-control-allow-origin', '*')
	return new Response(method === 'HEAD' ? null : response.body, {
		status: response.status,
		headers,
	})
}
