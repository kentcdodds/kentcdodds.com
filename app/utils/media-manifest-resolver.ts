import imagesManifestData from '../../content/data/media-manifests/images.json'
import videosManifestData from '../../content/data/media-manifests/videos.json'

type MediaManifestAsset = {
	id: string
	checksum: string
	sourcePath: string
	uploadedAt: string
}

type MediaManifest = {
	version: number
	assets: Record<string, MediaManifestAsset>
}

const imagesManifest = imagesManifestData as MediaManifest
const videosManifest = videosManifestData as MediaManifest

const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg']
const extensionPattern = new RegExp(`\\.(${imageExtensions.join('|')})$`, 'i')

function normalizeMediaKey(mediaKey: string | null | undefined) {
	if (typeof mediaKey !== 'string') return ''
	const trimmedKey = decodeURIComponent(mediaKey.trim())
		.split(/[?#]/, 1)[0]!
		.replace(/^\/+/, '')
	const withoutProtocolAndHost = trimmedKey.replace(
		/^https?:\/\/[^/]+\//i,
		'',
	)
	const withoutKnownHostPrefix = withoutProtocolAndHost.replace(
		/^(?:www\.)?kentcdodds\.com\//i,
		'',
	)
	const withoutMediaHostPrefix = withoutKnownHostPrefix.replace(
		/^media\.(?:kcd|kentcdodds)\.com\//i,
		'',
	)
	const withoutImagesPrefix = withoutMediaHostPrefix.replace(/^images\//i, '')
	return withoutImagesPrefix.replace(/^content\//, '')
}

function createManifestAliases(manifest: MediaManifest) {
	const extensionlessAliases = new Map<string, string>()
	const bannerAliases = new Map<string, string>()

	for (const key of Object.keys(manifest.assets)) {
		const extensionlessKey = key.replace(extensionPattern, '')
		if (extensionlessKey !== key && !extensionlessAliases.has(extensionlessKey)) {
			extensionlessAliases.set(extensionlessKey, key)
		}

		const bannerMatch = key.match(/^(.*)\/(banner|0)\.[^/.]+$/i)
		if (!bannerMatch) continue

		const bannerAliasKey = `${bannerMatch[1]}/banner`
		const existingKey = bannerAliases.get(bannerAliasKey)
		const isNamedBanner = /\/banner\.[^/.]+$/i.test(key)
		if (!existingKey || isNamedBanner) {
			bannerAliases.set(bannerAliasKey, key)
		}
	}

	return { extensionlessAliases, bannerAliases }
}

const imageManifestAliases = createManifestAliases(imagesManifest)
const videoManifestAliases = createManifestAliases(videosManifest)

function resolveAliasForMediaKey({
	manifest,
	aliases,
	normalizedKey,
}: {
	manifest: MediaManifest
	aliases: ReturnType<typeof createManifestAliases>
	normalizedKey: string
}) {
	const exactMatch = manifest.assets[normalizedKey]
	if (exactMatch) return exactMatch.id

	const bannerAlias = aliases.bannerAliases.get(normalizedKey)
	if (bannerAlias) return manifest.assets[bannerAlias]?.id ?? null

	const extensionlessAlias = aliases.extensionlessAliases.get(normalizedKey)
	if (extensionlessAlias) return manifest.assets[extensionlessAlias]?.id ?? null

	return null
}

function resolveManifestAssetId({
	manifest,
	aliases,
	mediaKey,
}: {
	manifest: MediaManifest
	aliases?: ReturnType<typeof createManifestAliases>
	mediaKey: string | null | undefined
}) {
	const normalizedKey = normalizeMediaKey(mediaKey)
	if (!normalizedKey) return mediaKey ?? ''
	const manifestAliases = aliases ?? createManifestAliases(manifest)
	return (
		resolveAliasForMediaKey({
			manifest,
			aliases: manifestAliases,
			normalizedKey,
		}) ?? normalizedKey
	)
}

export function resolveMediaImageId(mediaKey: string | null | undefined) {
	return resolveManifestAssetId({
		manifest: imagesManifest,
		aliases: imageManifestAliases,
		mediaKey,
	})
}

export function resolveMediaVideoId(mediaKey: string | null | undefined) {
	return resolveManifestAssetId({
		manifest: videosManifest,
		aliases: videoManifestAliases,
		mediaKey,
	})
}

export { normalizeMediaKey, resolveManifestAssetId }
