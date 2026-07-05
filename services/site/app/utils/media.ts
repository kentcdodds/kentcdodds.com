/**
 * Media URL contract for Cloudflare-hosted images and video.
 *
 * Assets live in the `kentcdodds-com` R2 bucket keyed by their (legacy)
 * Cloudinary public IDs. They are served through the site worker at:
 *
 *   /media/<transform-segment>/<asset-id>   (transformed image)
 *   /media/<asset-id>                       (original bytes; used for video)
 *
 * The transform segment is a comma-separated, canonically-ordered list of
 * `key_value` pairs (e.g. `w_800,h_600,fit_cover,f_auto`). This module is
 * client-safe (no server-only imports) and is shared by the app (URL
 * building) and the workers (URL parsing).
 */

export type MediaFit = 'cover' | 'contain' | 'pad' | 'scale-down'

export type MediaGravity = 'auto' | 'top' | 'bottom' | 'left' | 'right'

export type MediaFormat = 'auto' | 'webp' | 'avif' | 'jpeg' | 'png' | 'gif'

export type MediaTransform = {
	width?: number
	height?: number
	/** `3:4` or `3/4`; combined with width or height to derive the other. */
	aspectRatio?: string
	fit?: MediaFit
	gravity?: MediaGravity
	/** Hex color without `#` (e.g. `e6e9ee`) or a CSS color name. */
	background?: string
	/** Blur radius 1–250. */
	blur?: number
	/** 1–100. Omitted means the server default. */
	quality?: number
	format?: MediaFormat
}

export const MEDIA_PATH_PREFIX = '/media/'

const TRANSFORM_KEYS = [
	'w',
	'h',
	'fit',
	'g',
	'bg',
	'blur',
	'q',
	'f',
] as const
type TransformKey = (typeof TRANSFORM_KEYS)[number]

export function parseAspectRatio(aspectRatio: string): number | undefined {
	const [w, h] = aspectRatio.split(/[:/]/).map(Number)
	if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) return undefined
	return w / h
}

function deriveDimensions({
	width,
	height,
	aspectRatio,
}: Pick<MediaTransform, 'width' | 'height' | 'aspectRatio'>) {
	if (!aspectRatio) return { width, height }
	const ratio = parseAspectRatio(aspectRatio)
	if (!ratio) return { width, height }
	if (width && !height) return { width, height: Math.round(width / ratio) }
	if (height && !width) return { width: Math.round(height * ratio), height }
	return { width, height }
}

export function serializeMediaTransform(
	transform: MediaTransform,
): string | undefined {
	const { width, height } = deriveDimensions(transform)
	const pairs: Array<[TransformKey, string]> = []
	if (width) pairs.push(['w', String(Math.round(width))])
	if (height) pairs.push(['h', String(Math.round(height))])
	if (transform.fit) pairs.push(['fit', transform.fit])
	if (transform.gravity && transform.gravity !== 'auto') {
		pairs.push(['g', transform.gravity])
	} else if (transform.gravity === 'auto' && (width || height)) {
		pairs.push(['g', 'auto'])
	}
	if (transform.background) pairs.push(['bg', transform.background])
	if (transform.blur) pairs.push(['blur', String(transform.blur)])
	if (transform.quality) pairs.push(['q', String(transform.quality)])
	if (transform.format) pairs.push(['f', transform.format])
	if (pairs.length === 0) return undefined
	// Canonical key order keeps cache keys stable regardless of caller order.
	pairs.sort(
		(a, b) => TRANSFORM_KEYS.indexOf(a[0]) - TRANSFORM_KEYS.indexOf(b[0]),
	)
	return pairs.map(([key, value]) => `${key}_${value}`).join(',')
}

export function encodeMediaId(id: string) {
	return id
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/')
}

/**
 * Builds a site-relative media URL. Pass `origin` for contexts that need an
 * absolute URL (emails, Gravatar fallbacks, OG tags).
 */
export function buildMediaUrl(
	id: string,
	transform?: MediaTransform,
	{ origin }: { origin?: string } = {},
) {
	const cleanId = id.replace(/^\/+/, '')
	const segment = transform ? serializeMediaTransform(transform) : undefined
	const path = segment
		? `${MEDIA_PATH_PREFIX}${segment}/${encodeMediaId(cleanId)}`
		: `${MEDIA_PATH_PREFIX}${encodeMediaId(cleanId)}`
	return origin ? `${origin.replace(/\/+$/, '')}${path}` : path
}

const TRANSFORM_SEGMENT_PATTERN =
	/^(?:[a-z]+_[^,/]+)(?:,[a-z]+_[^,/]+)*$/

export type ParsedMediaRequest = {
	id: string
	transform: MediaTransform | undefined
}

/**
 * Parses `/media/...` pathnames. Returns null for non-media paths.
 * The first path segment is treated as a transform segment only when it
 * matches the `key_value(,key_value)*` shape and uses known keys.
 */
export function parseMediaPath(pathname: string): ParsedMediaRequest | null {
	if (!pathname.startsWith(MEDIA_PATH_PREFIX)) return null
	const rest = pathname.slice(MEDIA_PATH_PREFIX.length)
	if (!rest) return null
	const [first = '', ...idParts] = rest.split('/')
	const decode = (parts: Array<string>) =>
		parts.map((part) => decodeURIComponent(part)).join('/')

	if (idParts.length > 0 && TRANSFORM_SEGMENT_PATTERN.test(first)) {
		const transform: MediaTransform = {}
		let allKnown = true
		for (const pair of first.split(',')) {
			const underscore = pair.indexOf('_')
			const key = pair.slice(0, underscore)
			const value = pair.slice(underscore + 1)
			switch (key) {
				case 'w':
					transform.width = Number(value)
					break
				case 'h':
					transform.height = Number(value)
					break
				case 'fit':
					transform.fit = value as MediaFit
					break
				case 'g':
					transform.gravity = value as MediaGravity
					break
				case 'bg':
					transform.background = value
					break
				case 'blur':
					transform.blur = Number(value)
					break
				case 'q':
					transform.quality = Number(value)
					break
				case 'f':
					transform.format = value as MediaFormat
					break
				default:
					allKnown = false
			}
		}
		if (allKnown) {
			return { id: decode(idParts), transform }
		}
	}
	return { id: decode([first, ...idParts]), transform: undefined }
}

/**
 * The R2 bucket contains a mix of key styles: assets copied by hand live
 * under prefix-stripped keys, while script-migrated assets use the exact
 * Cloudinary public ID. Try candidates in order.
 */
export function mediaKeyCandidates(id: string): Array<string> {
	const candidates = [id]
	const contentStripped = id.replace(/^kentcdodds\.com\/content\//, '')
	const hostStripped = id.replace(/^kentcdodds\.com\//, '')
	if (!candidates.includes(contentStripped)) candidates.push(contentStripped)
	if (!candidates.includes(hostStripped)) candidates.push(hostStripped)
	return candidates
}
