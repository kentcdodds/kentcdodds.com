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

function normalizeMediaKey(mediaKey: string | null | undefined) {
	if (typeof mediaKey !== 'string') return ''
	const trimmedKey = mediaKey.replace(/^\/+/, '')
	return trimmedKey.replace(/^content\//, '')
}

function resolveManifestAssetId({
	manifest,
	mediaKey,
}: {
	manifest: MediaManifest
	mediaKey: string | null | undefined
}) {
	const normalizedKey = normalizeMediaKey(mediaKey)
	if (!normalizedKey) return mediaKey ?? ''
	const mappedAsset = manifest.assets[normalizedKey]
	return mappedAsset?.id ?? normalizedKey
}

export function resolveMediaImageId(mediaKey: string | null | undefined) {
	return resolveManifestAssetId({ manifest: imagesManifest, mediaKey })
}

export function resolveMediaVideoId(mediaKey: string | null | undefined) {
	return resolveManifestAssetId({ manifest: videosManifest, mediaKey })
}

export { normalizeMediaKey, resolveManifestAssetId }
