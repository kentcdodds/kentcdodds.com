import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type MediaManifestAsset = {
	id: string
	checksum: string
	sourcePath: string
	uploadedAt: string
}

type MediaManifest = {
	version: 1
	assets: Record<string, MediaManifestAsset>
}

type CliOptions = {
	dryRun: boolean
	deleteLocal: boolean
	bucket: string
	manifestBucket: string
	endpoint: string
	accessKeyId: string
	secretAccessKey: string
}

const manifestPaths = [
	path.join(process.cwd(), 'content/data/media-manifests/images.json'),
	path.join(process.cwd(), 'content/data/media-manifests/videos.json'),
]

const imageExtensions = new Set([
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp',
	'.avif',
	'.svg',
	'.ico',
])

const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm'])

function parseArgs(argv: Array<string>): CliOptions {
	const envBucket = process.env.MEDIA_R2_BUCKET ?? process.env.R2_BUCKET ?? ''
	const envEndpoint = process.env.MEDIA_R2_ENDPOINT ?? process.env.R2_ENDPOINT ?? ''
	const envAccessKeyId = process.env.R2_ACCESS_KEY_ID ?? ''
	const envSecretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? ''
	const options: CliOptions = {
		dryRun: false,
		deleteLocal: false,
		bucket: envBucket,
		manifestBucket: envBucket || 'media',
		endpoint: envEndpoint,
		accessKeyId: envAccessKeyId,
		secretAccessKey: envSecretAccessKey,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		switch (arg) {
			case '--dry-run':
				options.dryRun = true
				break
			case '--delete-local':
				options.deleteLocal = true
				break
			case '--bucket':
				options.bucket = argv[index + 1] ?? options.bucket
				index += 1
				break
			case '--manifest-bucket':
				options.manifestBucket = argv[index + 1] ?? options.manifestBucket
				index += 1
				break
			case '--endpoint':
				options.endpoint = argv[index + 1] ?? options.endpoint
				index += 1
				break
			case '--access-key-id':
				options.accessKeyId = argv[index + 1] ?? options.accessKeyId
				index += 1
				break
			case '--secret-access-key':
				options.secretAccessKey = argv[index + 1] ?? options.secretAccessKey
				index += 1
				break
			default:
				if (arg?.startsWith('-')) {
					throw new Error(`Unknown argument: ${arg}`)
				}
		}
	}

	if (!options.bucket) throw new Error('Missing R2 bucket (--bucket)')
	if (!options.endpoint) throw new Error('Missing R2 endpoint (--endpoint)')
	if (!options.accessKeyId) throw new Error('Missing R2 access key (--access-key-id)')
	if (!options.secretAccessKey)
		throw new Error('Missing R2 secret key (--secret-access-key)')
	if (!options.manifestBucket)
		throw new Error('Missing manifest bucket (--manifest-bucket)')

	return options
}

async function readManifest(filePath: string): Promise<MediaManifest> {
	const source = await fs.readFile(filePath, 'utf8')
	return JSON.parse(source) as MediaManifest
}

async function writeManifest(filePath: string, manifest: MediaManifest) {
	await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function discoverLocalContentMediaAssets() {
	const contentRoot = path.resolve(process.cwd(), 'content')
	const discovered: Array<{
		mediaKey: string
		sourcePath: string
		checksum: string
		kind: 'image' | 'video'
	}> = []

	async function walk(directory: string) {
		const entries = await fs.readdir(directory, { withFileTypes: true })
		for (const entry of entries) {
			const absolutePath = path.join(directory, entry.name)
			if (entry.isDirectory()) {
				const normalized = absolutePath.split(path.sep).join('/')
				if (normalized.includes('/content/data/')) continue
				await walk(absolutePath)
				continue
			}
			if (!entry.isFile()) continue
			const extension = path.extname(entry.name).toLowerCase()
			const kind = imageExtensions.has(extension)
				? 'image'
				: videoExtensions.has(extension)
					? 'video'
					: null
			if (!kind) continue
			const relativePath = path.relative(contentRoot, absolutePath)
			if (!relativePath || relativePath.startsWith('..')) continue
			const mediaKey = relativePath.split(path.sep).join('/')
			const sourcePath = `content/${mediaKey}`
			const fileBuffer = await fs.readFile(absolutePath)
			const checksum = createHash('sha256').update(fileBuffer).digest('hex')
			discovered.push({ mediaKey, sourcePath, checksum, kind })
		}
	}

	await walk(contentRoot)
	return discovered
}

function inferMimeType(filePath: string) {
	const extension = path.extname(filePath).toLowerCase()
	switch (extension) {
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg'
		case '.png':
			return 'image/png'
		case '.gif':
			return 'image/gif'
		case '.webp':
			return 'image/webp'
		case '.avif':
			return 'image/avif'
		case '.svg':
			return 'image/svg+xml'
		case '.mp4':
			return 'video/mp4'
		case '.mov':
			return 'video/quicktime'
		case '.m4v':
			return 'video/x-m4v'
		case '.webm':
			return 'video/webm'
		case '.ico':
			return 'image/x-icon'
		default:
			return 'application/octet-stream'
	}
}

function getNormalizedSourcePath(sourcePath: string) {
	if (sourcePath.startsWith('r2://')) return null
	return sourcePath.replace(/^\/+/, '')
}

function toManifestR2Path(manifestBucket: string, mediaKey: string) {
	return `r2://${manifestBucket}/${mediaKey}`
}

function upsertDiscoveredAssetsIntoManifests({
	discoveredAssets,
	imagesManifest,
	videosManifest,
}: {
	discoveredAssets: Array<{
		mediaKey: string
		sourcePath: string
		checksum: string
		kind: 'image' | 'video'
	}>
	imagesManifest: MediaManifest
	videosManifest: MediaManifest
}) {
	const nowIsoString = new Date().toISOString()
	let upserted = 0
	for (const asset of discoveredAssets) {
		const targetManifest =
			asset.kind === 'image' ? imagesManifest : videosManifest
		const otherManifest =
			asset.kind === 'image' ? videosManifest : imagesManifest
		delete otherManifest.assets[asset.mediaKey]
		const existingAsset = targetManifest.assets[asset.mediaKey]
		targetManifest.assets[asset.mediaKey] = {
			id: asset.mediaKey,
			checksum: asset.checksum,
			sourcePath: asset.sourcePath,
			uploadedAt: existingAsset?.uploadedAt ?? nowIsoString,
		}
		upserted += 1
	}
	return upserted
}

async function uploadManifestAssets({
	options,
	manifestPath,
	manifest,
	client,
	uploadedKeys,
}: {
	options: CliOptions
	manifestPath: string
	manifest: MediaManifest
	client: S3Client
	uploadedKeys: Set<string>
}) {
	let uploaded = 0
	let skipped = 0
	let missing = 0
	let deleted = 0

	for (const [mediaKey, asset] of Object.entries(manifest.assets)) {
		const normalizedSourcePath = getNormalizedSourcePath(asset.sourcePath)
		if (!normalizedSourcePath) {
			const canonicalR2Path = toManifestR2Path(options.manifestBucket, mediaKey)
			if (!options.dryRun && asset.sourcePath !== canonicalR2Path) {
				asset.sourcePath = canonicalR2Path
			}
			uploadedKeys.add(mediaKey)
			skipped += 1
			continue
		}
		const absolutePath = path.resolve(process.cwd(), normalizedSourcePath)
		const exists = await fs
			.stat(absolutePath)
			.then((stats) => stats.isFile())
			.catch(() => false)
		if (!exists) {
			if (!options.dryRun && uploadedKeys.has(mediaKey)) {
				asset.sourcePath = toManifestR2Path(options.manifestBucket, mediaKey)
				asset.uploadedAt = new Date().toISOString()
				skipped += 1
				continue
			}
			missing += 1
			console.warn(`missing source file: ${normalizedSourcePath}`)
			continue
		}
		if (options.dryRun) {
			uploaded += 1
			console.log(`[dry-run] upload ${normalizedSourcePath} -> ${mediaKey}`)
			continue
		}
		const body = await fs.readFile(absolutePath)
		await client.send(
			new PutObjectCommand({
				Bucket: options.bucket,
				Key: mediaKey,
				Body: body,
				ContentType: inferMimeType(normalizedSourcePath),
			}),
		)
		uploaded += 1
		uploadedKeys.add(mediaKey)
		asset.sourcePath = toManifestR2Path(options.manifestBucket, mediaKey)
		asset.uploadedAt = new Date().toISOString()
		if (options.deleteLocal) {
			await fs.unlink(absolutePath)
			deleted += 1
		}
	}

	console.log(
		`${path.basename(manifestPath)} uploaded=${uploaded} skipped=${skipped} missing=${missing} deletedLocal=${deleted}`,
	)
}

async function removeEmptyContentDirectories({
	directory,
	skipDirectories,
}: {
	directory: string
	skipDirectories: Set<string>
}) {
	if (skipDirectories.has(directory)) return
	const entries = await fs.readdir(directory, { withFileTypes: true })
	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		await removeEmptyContentDirectories({
			directory: path.join(directory, entry.name),
			skipDirectories,
		})
	}
	const remaining = await fs.readdir(directory)
	if (remaining.length === 0) {
		await fs.rmdir(directory)
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const uploadedKeys = new Set<string>()
	const [imagesManifestPath, videosManifestPath] = manifestPaths
	if (!imagesManifestPath || !videosManifestPath) {
		throw new Error('Missing required media manifest paths')
	}
	const manifestsByPath = new Map<string, MediaManifest>()
	for (const manifestPath of manifestPaths) {
		manifestsByPath.set(manifestPath, await readManifest(manifestPath))
	}
	const imagesManifest = manifestsByPath.get(imagesManifestPath)
	const videosManifest = manifestsByPath.get(videosManifestPath)
	if (!imagesManifest || !videosManifest) {
		throw new Error('Unable to load media manifests')
	}
	const discoveredAssets = await discoverLocalContentMediaAssets()
	const discoveredUpserts = upsertDiscoveredAssetsIntoManifests({
		discoveredAssets,
		imagesManifest,
		videosManifest,
	})
	if (discoveredUpserts > 0) {
		console.log(`discovered_local_media_assets=${discoveredUpserts}`)
	}
	const client = new S3Client({
		region: 'auto',
		endpoint: options.endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId: options.accessKeyId,
			secretAccessKey: options.secretAccessKey,
		},
	})

	for (const manifestPath of manifestPaths) {
		const manifest = manifestsByPath.get(manifestPath)
		if (!manifest) continue
		await uploadManifestAssets({
			options,
			manifestPath,
			manifest,
			client,
			uploadedKeys,
		})
		if (!options.dryRun) {
			await writeManifest(manifestPath, manifest)
		}
	}

	if (!options.dryRun && options.deleteLocal) {
		const contentRoot = path.resolve(process.cwd(), 'content')
		await removeEmptyContentDirectories({
			directory: contentRoot,
			skipDirectories: new Set([path.join(contentRoot, 'data')]),
		}).catch(() => {})
	}
}

main().catch((error: unknown) => {
	console.error(error)
	process.exitCode = 1
})
