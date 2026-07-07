import { OG_IMAGE_PATH } from './constants.ts'
import { encodeJsonBase64Url, decodeJsonBase64Url } from './base64url.ts'
import {
	constantTimeEqualHex,
	sha256HexSync,
	signOgPayloadSync,
} from './crypto-sync.ts'
import {
	getOgTemplate,
	isOgTemplateName,
	type OgTemplateName,
} from './registry.tsx'

const MAX_PARAMS_ENCODED_LENGTH = 4096

export function buildOgImageCanonicalPayload({
	template,
	version,
	paramsEncoded,
}: {
	template: OgTemplateName
	version: number
	paramsEncoded: string
}) {
	return `${template}\0${version}\0${paramsEncoded}`
}

export function buildOgImageUrl(
	origin: string,
	template: OgTemplateName,
	params: Record<string, unknown>,
	secret: string,
) {
	const definition = getOgTemplate(template)
	const parsed = definition.schema.parse(params)
	const paramsEncoded = encodeJsonBase64Url(parsed)
	if (paramsEncoded.length > MAX_PARAMS_ENCODED_LENGTH) {
		throw new Error('OG image params exceed maximum encoded size')
	}
	const canonical = buildOgImageCanonicalPayload({
		template,
		version: definition.version,
		paramsEncoded,
	})
	const sig = signOgPayloadSync(secret, canonical)
	const url = new URL(OG_IMAGE_PATH, origin)
	url.searchParams.set('tpl', template)
	url.searchParams.set('params', paramsEncoded)
	url.searchParams.set('v', String(definition.version))
	url.searchParams.set('sig', sig)
	return url.toString()
}

/**
 * Signed og-image URLs are cached externally (social scrapers, 1-year
 * immutable cache-control), so rotation must not 404 previously shared
 * links. Verification accepts the current secret plus any previous secrets;
 * signing (buildOgImageUrl) always uses the current secret only.
 */
export function verifyOgImageRequest(
	searchParams: URLSearchParams,
	secretOrSecrets: string | readonly string[],
) {
	const secrets = (
		typeof secretOrSecrets === 'string' ? [secretOrSecrets] : secretOrSecrets
	).filter((candidate) => candidate.trim().length > 0)
	if (secrets.length === 0) return null
	const template = searchParams.get('tpl')
	const paramsEncoded = searchParams.get('params')
	const versionRaw = searchParams.get('v')
	const sig = searchParams.get('sig')

	if (
		!template ||
		!paramsEncoded ||
		!versionRaw ||
		!sig ||
		!isOgTemplateName(template)
	) {
		return null
	}

	if (paramsEncoded.length > MAX_PARAMS_ENCODED_LENGTH) {
		return null
	}

	const version = Number(versionRaw)
	if (!Number.isInteger(version) || version <= 0) {
		return null
	}

	const definition = getOgTemplate(template)
	if (definition.version !== version) {
		return null
	}

	const canonical = buildOgImageCanonicalPayload({
		template,
		version,
		paramsEncoded,
	})
	const signatureMatches = secrets.some((candidate) =>
		constantTimeEqualHex(sig, signOgPayloadSync(candidate, canonical)),
	)
	if (!signatureMatches) {
		return null
	}

	let parsedParams: unknown
	try {
		parsedParams = decodeJsonBase64Url(paramsEncoded)
	} catch {
		return null
	}

	const params = definition.schema.safeParse(parsedParams)
	if (!params.success) {
		return null
	}

	return {
		template,
		version,
		params: params.data,
		cacheKey: `og-image:${sha256HexSync(canonical)}`,
	}
}

export function buildOgImageCacheKey(
	template: OgTemplateName,
	params: Record<string, unknown>,
	secret: string,
) {
	const definition = getOgTemplate(template)
	const paramsEncoded = encodeJsonBase64Url(definition.schema.parse(params))
	const canonical = buildOgImageCanonicalPayload({
		template,
		version: definition.version,
		paramsEncoded,
	})
	signOgPayloadSync(secret, canonical)
	return `og-image:${sha256HexSync(canonical)}`
}
