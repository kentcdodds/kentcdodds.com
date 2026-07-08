import emojiRegex from 'emoji-regex'
import {
	buildMediaUrl,
	parseMediaPath,
	type MediaTransform,
	serializeMediaTransform,
} from '#app/utils/media.ts'
import {
	findR2ObjectHead,
	PRODUCTION_MEDIA_ORIGIN,
	readR2MagicBytes,
	STAGING_MEDIA_ORIGIN,
	type MediaServingEnv,
	sniffImageContentType,
} from '#app/utils/media-serving.server.ts'

const emojiPattern = emojiRegex()

export type OgAssetEnv = {
	MEDIA_BUCKET?: MediaServingEnv['MEDIA_BUCKET']
	IMAGES?: MediaServingEnv['IMAGES']
}

function bytesToDataUri(bytes: Uint8Array, contentType: string) {
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return `data:${contentType};base64,${btoa(binary)}`
}

/**
 * Hosts external OG asset URLs may fetch from. Signed OG URLs can be minted
 * by any logged-in user (episode artwork preview), so the render path must
 * never fetch arbitrary attacker-chosen URLs (SSRF / resource burn). The
 * only legitimate external source is Gravatar avatars; everything else
 * resolves from R2 media ids.
 */
const ALLOWED_EXTERNAL_FETCH_HOSTS = new Set([
	'www.gravatar.com',
	'secure.gravatar.com',
	'gravatar.com',
])

function assertAllowedExternalUrl(url: string) {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		throw new Error(`Invalid external image URL: ${url}`)
	}
	if (parsed.protocol !== 'https:') {
		throw new Error(`External image URLs must be https: ${url}`)
	}
	if (!ALLOWED_EXTERNAL_FETCH_HOSTS.has(parsed.hostname)) {
		throw new Error(`External image host not allowed: ${parsed.hostname}`)
	}
}

async function fetchAsDataUri(url: string, maxBytes = 5_000_000) {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to fetch image (${response.status}): ${url}`)
	}
	const contentType = response.headers.get('content-type') ?? 'image/png'
	const buffer = await response.arrayBuffer()
	if (buffer.byteLength > maxBytes) {
		throw new Error(`Image too large (${buffer.byteLength} bytes): ${url}`)
	}
	return bytesToDataUri(new Uint8Array(buffer), contentType)
}

async function resolveMediaDataUri(
	env: OgAssetEnv | undefined,
	id: string,
	transform?: MediaTransform,
) {
	const headResult =
		env?.MEDIA_BUCKET && env.IMAGES
			? await findR2ObjectHead(env.MEDIA_BUCKET, id)
			: null
	if (env?.MEDIA_BUCKET && env.IMAGES && headResult) {
		const { key } = headResult
		const magic = await readR2MagicBytes(env.MEDIA_BUCKET, key)
		const segment = transform ? serializeMediaTransform(transform) : undefined
		const outputFormat = transform?.format && transform.format !== 'auto'
			? (`image/${transform.format}` as const)
			: sniffImageContentType(magic) === 'image/gif'
				? 'image/webp'
				: sniffImageContentType(magic) === 'image/png'
					? 'image/png'
					: sniffImageContentType(magic) === 'image/webp'
						? 'image/webp'
						: 'image/jpeg'

		const object = await env.MEDIA_BUCKET.get(key)
		if (!object) {
			throw new Error(`Media asset not found in R2: ${id}`)
		}

		if (!segment) {
			const bytes = new Uint8Array(await object.arrayBuffer())
			const contentType =
				object.httpMetadata?.contentType ??
				sniffImageContentType(bytes) ??
				'image/jpeg'
			return bytesToDataUri(bytes, contentType)
		}

		const outputOptions: {
			format: typeof outputFormat
			quality?: number
		} = { format: outputFormat }
		if (transform?.quality) {
			outputOptions.quality = Math.min(100, Math.max(1, transform.quality))
		}

		const transformOptions: Record<string, unknown> = {}
		if (transform?.width) transformOptions.width = transform.width
		if (transform?.height) transformOptions.height = transform.height
		if (transform?.fit) transformOptions.fit = transform.fit

		const result = await env.IMAGES.input(object.body)
			.transform(transformOptions)
			.output(outputOptions)
		const bytes = new Uint8Array(await result.response().arrayBuffer())
		return bytesToDataUri(bytes, result.contentType())
	}

	// No bindings (Node preview script) or object missing locally (dev with an
	// empty local R2): fetch through the deployed /media endpoint instead.
	let lastError: unknown
	for (const origin of [PRODUCTION_MEDIA_ORIGIN, STAGING_MEDIA_ORIGIN]) {
		try {
			return await fetchAsDataUri(buildMediaUrl(id, transform, { origin }))
		} catch (error) {
			lastError = error
		}
	}
	throw lastError
}

export function stripEmoji(value: string) {
	return value
		.replace(emojiPattern, '')
		.split(' ')
		.filter(Boolean)
		.join(' ')
		.trim()
}

export async function resolveFeaturedImageDataUri(
	featuredImage: string,
	env?: OgAssetEnv,
) {
	if (featuredImage.startsWith('data:')) {
		return featuredImage
	}
	if (featuredImage.startsWith('http://') || featuredImage.startsWith('https://')) {
		assertAllowedExternalUrl(featuredImage)
		return fetchAsDataUri(featuredImage)
	}
	if (featuredImage.startsWith('/media/')) {
		const parsed = parseMediaPath(featuredImage)
		if (!parsed) {
			throw new Error(`Invalid media path: ${featuredImage}`)
		}
		return resolveMediaDataUri(env, parsed.id, parsed.transform)
	}
	return resolveMediaDataUri(env, featuredImage, { width: 900 })
}

export async function resolveKentProfileDataUri(env?: OgAssetEnv) {
	return resolveMediaDataUri(env, 'kent/profile-transparent', {
		width: 320,
		height: 320,
	})
}

export async function resolveSocialBackgroundDataUri(env?: OgAssetEnv) {
	return resolveMediaDataUri(env, 'kentcdodds.com/social-background.png', {
		width: 2400,
		height: 1256,
	})
}

export async function resolveAvatarDataUri({
	avatarKind,
	avatarSource,
	size,
	env,
}: {
	avatarKind: 'fetch' | 'media'
	avatarSource: string
	size: number
	env?: OgAssetEnv
}) {
	if (avatarKind === 'fetch') {
		assertAllowedExternalUrl(avatarSource)
		return fetchAsDataUri(avatarSource)
	}
	return resolveMediaDataUri(env, avatarSource, {
		width: size,
		height: size,
	})
}

export async function resolveMicIllustrationDataUri(env?: OgAssetEnv) {
	return resolveMediaDataUri(env, 'kentcdodds.com/illustrations/mic', {
		height: 1900,
	})
}

export type OgResolvedAssets = {
	background: string
	kentProfile: string
	featuredImage?: string
	avatar?: string
	mic?: string
}
