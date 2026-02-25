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

async function uploadManifestAssets({
	options,
	manifestPath,
	client,
	uploadedKeys,
}: {
	options: CliOptions
	manifestPath: string
	client: S3Client
	uploadedKeys: Set<string>
}) {
	const manifest = await readManifest(manifestPath)
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

	if (!options.dryRun) {
		await writeManifest(manifestPath, manifest)
	}

	console.log(
		`${path.basename(manifestPath)} uploaded=${uploaded} skipped=${skipped} missing=${missing} deletedLocal=${deleted}`,
	)
}

async function removeEmptyContentDirectories(directory: string) {
	const entries = await fs.readdir(directory, { withFileTypes: true })
	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		await removeEmptyContentDirectories(path.join(directory, entry.name))
	}
	const remaining = await fs.readdir(directory)
	if (remaining.length === 0) {
		await fs.rmdir(directory)
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const uploadedKeys = new Set<string>()
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
		await uploadManifestAssets({ options, manifestPath, client, uploadedKeys })
	}

	if (!options.dryRun && options.deleteLocal) {
		for (const directory of ['content/blog', 'content/pages', 'content/writing-blog']) {
			const absolutePath = path.resolve(process.cwd(), directory)
			await removeEmptyContentDirectories(absolutePath).catch(() => {})
		}
	}
}

main().catch((error: unknown) => {
	console.error(error)
	process.exitCode = 1
})
