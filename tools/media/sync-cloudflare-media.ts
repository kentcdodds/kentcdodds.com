import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const imageExtensions = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.webp',
	'.avif',
	'.svg',
])

const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm'])

type MediaKind = 'image' | 'video'

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
	before?: string
	after?: string
	dryRun: boolean
	manifestDirectory: string
}

type ChangedFiles = {
	addedOrModified: Array<string>
	deleted: Array<string>
}

type UploadResult = {
	id: string
}

const imagesManifestFilename = 'images.json'
const videosManifestFilename = 'videos.json'

function parseArgs(argv: Array<string>): CliOptions {
	const options: CliOptions = {
		dryRun: false,
		manifestDirectory: 'content/data/media-manifests',
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
			case '--before':
				options.before = argv[index + 1]
				index += 1
				break
			case '--after':
				options.after = argv[index + 1]
				index += 1
				break
			case '--manifest-directory':
				options.manifestDirectory = argv[index + 1] ?? options.manifestDirectory
				index += 1
				break
			case '--dry-run':
				options.dryRun = true
				break
			default:
				if (arg.startsWith('-')) {
					throw new Error(`Unknown argument: ${arg}`)
				}
		}
	}

	return options
}

function normalizePath(filePath: string) {
	return filePath.replace(/\\/g, '/')
}

function isAllZerosSha(sha: string | undefined) {
	return typeof sha === 'string' && /^0+$/.test(sha)
}

function getMediaKind(filePath: string): MediaKind | null {
	const extension = path.extname(filePath).toLowerCase()
	if (imageExtensions.has(extension)) return 'image'
	if (videoExtensions.has(extension)) return 'video'
	return null
}

function getMediaKey(filePath: string) {
	return normalizePath(filePath).replace(/^content\//, '')
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
		default:
			return 'application/octet-stream'
	}
}

async function inferMimeTypeFromFile(filePath: string) {
	const fromExtension = inferMimeType(filePath)
	if (
		fromExtension !== 'application/octet-stream' &&
		fromExtension !== 'image/avif'
	) {
		return fromExtension
	}

	const bytes = await fs.readFile(filePath)
	if (bytes.length >= 8) {
		const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
		if (pngSignature.every((value, index) => bytes[index] === value)) {
			return 'image/png'
		}
	}
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg'
	}
	if (bytes.length >= 6) {
		const header = bytes.subarray(0, 6).toString('ascii')
		if (header === 'GIF87a' || header === 'GIF89a') {
			return 'image/gif'
		}
	}
	if (bytes.length >= 12) {
		const riff = bytes.subarray(0, 4).toString('ascii')
		const webp = bytes.subarray(8, 12).toString('ascii')
		if (riff === 'RIFF' && webp === 'WEBP') {
			return 'image/webp'
		}
	}
	if (bytes.length >= 12) {
		const boxType = bytes.subarray(4, 12).toString('ascii').toLowerCase()
		if (boxType.includes('ftypavif')) {
			return 'image/avif'
		}
	}
	if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
		return 'image/x-icon'
	}
	const preview = bytes.subarray(0, 200).toString('utf8').toLowerCase()
	if (preview.includes('<svg') || preview.includes('<?xml')) {
		return 'image/svg+xml'
	}

	return fromExtension
}

function getChangedFiles(before: string, after: string): ChangedFiles {
	const output = execSync(`git diff --name-status ${before} ${after} -- content`, {
		encoding: 'utf8',
	})
	const addedOrModified = new Set<string>()
	const deleted = new Set<string>()
	const lines = output.split('\n').filter(Boolean)
	for (const line of lines) {
		const [status, sourcePath, targetPath] = line.split('\t')
		if (!status) continue
		if (status.startsWith('R') && sourcePath && targetPath) {
			deleted.add(normalizePath(sourcePath))
			addedOrModified.add(normalizePath(targetPath))
			continue
		}
		if ((status === 'A' || status === 'M') && sourcePath) {
			addedOrModified.add(normalizePath(sourcePath))
			continue
		}
		if (status === 'D' && sourcePath) {
			deleted.add(normalizePath(sourcePath))
		}
	}
	return {
		addedOrModified: [...addedOrModified],
		deleted: [...deleted],
	}
}

async function walkFiles(directory: string): Promise<Array<string>> {
	const entries = await fs.readdir(directory, { withFileTypes: true })
	const files: Array<string> = []
	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			files.push(...(await walkFiles(absolutePath)))
			continue
		}
		if (entry.isFile()) {
			files.push(normalizePath(path.relative(process.cwd(), absolutePath)))
		}
	}
	return files
}

async function collectCandidateMediaFiles(options: CliOptions) {
	if (
		options.before &&
		options.after &&
		!isAllZerosSha(options.before) &&
		!isAllZerosSha(options.after)
	) {
		return getChangedFiles(options.before, options.after)
	}

	const allContentFiles = await walkFiles(path.join(process.cwd(), 'content'))
	return {
		addedOrModified: allContentFiles,
		deleted: [],
	}
}

async function readManifest(filePath: string): Promise<MediaManifest> {
	try {
		const source = await fs.readFile(filePath, 'utf8')
		const parsed = JSON.parse(source) as MediaManifest
		if (parsed.version !== 1 || typeof parsed.assets !== 'object') {
			throw new Error(`Invalid manifest schema: ${filePath}`)
		}
		return parsed
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return { version: 1, assets: {} }
		}
		throw error
	}
}

async function writeManifest(filePath: string, manifest: MediaManifest) {
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function checksumFile(filePath: string) {
	const bytes = await fs.readFile(filePath)
	return createHash('sha256').update(bytes).digest('hex')
}

function getCloudflareEnv() {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
	const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()
	const apiBaseUrl = (
		process.env.CLOUDFLARE_API_BASE_URL?.trim() ?? 'https://api.cloudflare.com/client/v4'
	).replace(/\/+$/, '')
	return { accountId, apiToken, apiBaseUrl }
}

async function uploadImage({
	filePath,
	accountId,
	apiToken,
	apiBaseUrl,
}: {
	filePath: string
	accountId: string
	apiToken: string
	apiBaseUrl: string
}): Promise<UploadResult> {
	const bytes = await fs.readFile(filePath)
	const mimeType = await inferMimeTypeFromFile(filePath)
	const form = new FormData()
	form.set(
		'file',
		new Blob([bytes], { type: mimeType }),
		path.basename(filePath),
	)
	const response = await fetch(`${apiBaseUrl}/accounts/${accountId}/images/v1`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiToken}` },
		body: form,
	})
	const payload = (await response.json()) as {
		success?: boolean
		result?: { id?: string }
		errors?: Array<{ message?: string }>
	}
	if (!response.ok || !payload.success || !payload.result?.id) {
		const errors = payload.errors?.map((error) => error.message).join(', ')
		throw new Error(`Image upload failed for ${filePath}: ${errors ?? response.statusText}`)
	}
	return { id: payload.result.id }
}

async function uploadVideo({
	filePath,
	accountId,
	apiToken,
	apiBaseUrl,
}: {
	filePath: string
	accountId: string
	apiToken: string
	apiBaseUrl: string
}): Promise<UploadResult> {
	const bytes = await fs.readFile(filePath)
	const mimeType = await inferMimeTypeFromFile(filePath)
	const form = new FormData()
	form.set(
		'file',
		new Blob([bytes], { type: mimeType }),
		path.basename(filePath),
	)
	const response = await fetch(`${apiBaseUrl}/accounts/${accountId}/stream`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
		},
		body: form,
	})
	const payload = (await response.json()) as {
		success?: boolean
		result?: { uid?: string }
		errors?: Array<{ message?: string }>
	}
	if (!response.ok || !payload.success || !payload.result?.uid) {
		const errors = payload.errors?.map((error) => error.message).join(', ')
		throw new Error(`Video upload failed for ${filePath}: ${errors ?? response.statusText}`)
	}
	return { id: payload.result.uid }
}

function validateManifestShape({
	manifest,
	kind,
}: {
	manifest: MediaManifest
	kind: MediaKind
}) {
	for (const [key, asset] of Object.entries(manifest.assets)) {
		const expectedSourcePath = `content/${key}`
		if (asset.sourcePath !== expectedSourcePath) {
			throw new Error(
				`Manifest sourcePath mismatch for "${key}". Expected "${expectedSourcePath}", got "${asset.sourcePath}".`,
			)
		}
		if (!asset.id.trim()) {
			throw new Error(`Manifest id is empty for "${key}".`)
		}
		const inferredKind = getMediaKind(asset.sourcePath)
		if (inferredKind !== null && inferredKind !== kind) {
			throw new Error(
				`Manifest media kind mismatch for "${key}". Expected ${kind}, got ${String(inferredKind)}.`,
			)
		}
	}
}

async function syncManifestForKind({
	kind,
	candidates,
	deleted,
	manifest,
	manifestPath,
	options,
	cloudflareEnv,
}: {
	kind: MediaKind
	candidates: Array<string>
	deleted: Array<string>
	manifest: MediaManifest
	manifestPath: string
	options: CliOptions
	cloudflareEnv: ReturnType<typeof getCloudflareEnv>
}) {
	let manifestUpdated = false
	const failedUploads: Array<string> = []
	const { accountId, apiToken, apiBaseUrl } = cloudflareEnv

	for (const filePath of candidates) {
		const key = getMediaKey(filePath)
		const mediaKind = getMediaKind(filePath)
		const isMappedInManifest = Boolean(manifest.assets[key])
		if (mediaKind !== kind && !isMappedInManifest) continue
		const sourcePath = normalizePath(filePath)
		const checksum = await checksumFile(sourcePath)
		const existing = manifest.assets[key]
		const shouldForceUpload =
			!existing ||
			existing.checksum !== checksum ||
			existing.id === key ||
			existing.sourcePath !== sourcePath
		if (!shouldForceUpload) {
			continue
		}

		if (options.dryRun) {
			console.log(`[dry-run] upload ${kind}: ${sourcePath}`)
			manifestUpdated = true
			continue
		}

		if (!accountId || !apiToken) {
			throw new Error(
				`Missing CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN for ${kind} upload.`,
			)
		}

		try {
			const uploadResult =
				kind === 'image'
					? await uploadImage({ filePath: sourcePath, accountId, apiToken, apiBaseUrl })
					: await uploadVideo({ filePath: sourcePath, accountId, apiToken, apiBaseUrl })
			manifest.assets[key] = {
				id: uploadResult.id,
				checksum,
				sourcePath,
				uploadedAt: new Date().toISOString(),
			}
			console.log(`uploaded ${kind}: ${sourcePath} -> ${uploadResult.id}`)
			manifestUpdated = true
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error)
			failedUploads.push(`${sourcePath}: ${message}`)
			console.warn(`failed ${kind}: ${sourcePath}: ${message}`)
		}
	}

	for (const filePath of deleted) {
		if (getMediaKind(filePath) !== kind) continue
		const key = getMediaKey(filePath)
		if (!manifest.assets[key]) continue
		console.log(`${options.dryRun ? '[dry-run] ' : ''}remove deleted ${kind}: ${filePath}`)
		if (!options.dryRun) {
			delete manifest.assets[key]
		}
		manifestUpdated = true
	}

	validateManifestShape({ manifest, kind })
	if (manifestUpdated && !options.dryRun) {
		await writeManifest(manifestPath, manifest)
		console.log(`updated manifest: ${manifestPath}`)
	}
	return { manifestUpdated, failedUploads }
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const changedFiles = await collectCandidateMediaFiles(options)
	const imagesManifestPath = path.join(options.manifestDirectory, imagesManifestFilename)
	const videosManifestPath = path.join(options.manifestDirectory, videosManifestFilename)
	const [imagesManifest, videosManifest] = await Promise.all([
		readManifest(imagesManifestPath),
		readManifest(videosManifestPath),
	])

	const candidateFiles = changedFiles.addedOrModified.filter((filePath) => {
		if (!filePath.startsWith('content/')) return false
		const mediaKind = getMediaKind(filePath)
		if (mediaKind !== null) return true
		const key = getMediaKey(filePath)
		return Boolean(imagesManifest.assets[key] || videosManifest.assets[key])
	})
	const deletedFiles = changedFiles.deleted.filter((filePath) => {
		if (!filePath.startsWith('content/')) return false
		const mediaKind = getMediaKind(filePath)
		if (mediaKind !== null) return true
		const key = getMediaKey(filePath)
		return Boolean(imagesManifest.assets[key] || videosManifest.assets[key])
	})

	console.log(`media candidates: ${candidateFiles.length}, deleted: ${deletedFiles.length}`)
	if (!candidateFiles.length && !deletedFiles.length) {
		console.log('No changed media files detected under content/**.')
		return
	}

	const cloudflareEnv = getCloudflareEnv()
	const [imagesResult, videosResult] = await Promise.all([
		syncManifestForKind({
			kind: 'image',
			candidates: candidateFiles,
			deleted: deletedFiles,
			manifest: imagesManifest,
			manifestPath: imagesManifestPath,
			options,
			cloudflareEnv,
		}),
		syncManifestForKind({
			kind: 'video',
			candidates: candidateFiles,
			deleted: deletedFiles,
			manifest: videosManifest,
			manifestPath: videosManifestPath,
			options,
			cloudflareEnv,
		}),
	])
	const failures = [...imagesResult.failedUploads, ...videosResult.failedUploads]
	if (failures.length > 0) {
		throw new Error(
			`Media sync encountered ${failures.length} upload failures:\n${failures.join('\n')}`,
		)
	}

	if (!imagesResult.manifestUpdated && !videosResult.manifestUpdated) {
		console.log('No media uploads required (manifests already up to date).')
		return
	}

	if (options.dryRun) {
		console.log('Dry run completed. No remote uploads or manifest writes performed.')
	}
}

const isEntrypoint = Boolean(
	process.argv[1]?.endsWith('sync-cloudflare-media.ts'),
)

if (isEntrypoint) {
	main().catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
}

export {
	getChangedFiles,
	getMediaKind,
	getMediaKey,
	inferMimeType,
	isAllZerosSha,
	parseArgs,
}
