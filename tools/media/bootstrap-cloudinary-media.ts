import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

type MediaKind = 'image' | 'video'

type CliOptions = {
	dryRun: boolean
	limit: number | null
	cloudName: string
}

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

const contentRootDirectory = path.join(process.cwd(), 'content')
const imageManifestPath = path.join(
	process.cwd(),
	'content/data/media-manifests/images.json',
)
const videoManifestPath = path.join(
	process.cwd(),
	'content/data/media-manifests/videos.json',
)
const imageSourcePath = path.join(process.cwd(), 'app/images.tsx')
const kifsSourcePath = path.join(process.cwd(), 'app/components/kifs.tsx')

function parseArgs(argv: Array<string>): CliOptions {
	const options: CliOptions = {
		dryRun: false,
		limit: null,
		cloudName: 'kentcdodds-com',
	}
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		switch (arg) {
			case '--dry-run':
				options.dryRun = true
				break
			case '--limit': {
				const value = Number(argv[index + 1] ?? '')
				if (!Number.isFinite(value) || value < 1) {
					throw new Error('--limit must be a positive number')
				}
				options.limit = Math.floor(value)
				index += 1
				break
			}
			case '--cloud-name':
				options.cloudName = argv[index + 1] ?? options.cloudName
				index += 1
				break
			default:
				if (arg?.startsWith('-')) {
					throw new Error(`Unknown argument: ${arg}`)
				}
		}
	}
	return options
}

async function readManifest(filePath: string): Promise<MediaManifest> {
	try {
		const source = await fs.readFile(filePath, 'utf8')
		const parsed = JSON.parse(source) as MediaManifest
		return parsed.version === 1 && parsed.assets
			? parsed
			: { version: 1, assets: {} }
	} catch (error: unknown) {
		const fileError = error as NodeJS.ErrnoException
		if (fileError.code === 'ENOENT') return { version: 1, assets: {} }
		throw error
	}
}

async function writeManifest(filePath: string, manifest: MediaManifest) {
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function normalizeKey(key: string) {
	return key.replace(/^\/+/, '').replace(/^content\//, '')
}

function isSafeKey(key: string) {
	return !key.includes('..') && !path.isAbsolute(key)
}

const videoExtensionRegex = /\.(mp4|mov|m4v|webm)$/i

function isVideoKey(key: string) {
	return videoExtensionRegex.test(key)
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
		if (!entry.isFile()) continue
		files.push(absolutePath)
	}
	return files
}

async function collectContentMediaKeys() {
	const files = await walkFiles(contentRootDirectory)
	const contentFiles = files.filter((filePath) =>
		/\.(mdx|md|yml|yaml|tsx|ts|jsx|js)$/i.test(filePath),
	)
	const imageKeys = new Set<string>()
	const videoKeys = new Set<string>()
	const mediaRegex = /\/media\/([^\s)"'>\]]+)/g
	const streamRegex = /\/stream\/([^\s)"'>\]]+)/g

	for (const filePath of contentFiles) {
		const source = await fs.readFile(filePath, 'utf8')
		for (const regex of [mediaRegex, streamRegex]) {
			regex.lastIndex = 0
			let match: RegExpExecArray | null = null
			while ((match = regex.exec(source))) {
				const key = normalizeKey(decodeURIComponent(match[1]?.split('?')[0] ?? ''))
				if (!key || !isSafeKey(key)) continue
				if (!key.startsWith('kentcdodds.com/')) continue
				if (regex === streamRegex || isVideoKey(key)) {
					videoKeys.add(key)
				} else {
					imageKeys.add(key)
				}
			}
		}
	}

	return { imageKeys, videoKeys }
}

async function collectImageComponentKeys() {
	const source = await fs.readFile(imageSourcePath, 'utf8')
	const keys = new Set<string>()
	const regex = /id:\s*'([^']+)'/g
	let match: RegExpExecArray | null = null
	while ((match = regex.exec(source))) {
		const key = normalizeKey(match[1] ?? '')
		if (!key || !isSafeKey(key)) continue
		keys.add(key)
	}
	return keys
}

async function collectKifsVideoKeys() {
	const source = await fs.readFile(kifsSourcePath, 'utf8')
	const keys = new Set<string>()
	const regex = /imageId="([^"]+)"/g
	let match: RegExpExecArray | null = null
	while ((match = regex.exec(source))) {
		const key = normalizeKey(match[1] ?? '')
		if (!key || !isSafeKey(key)) continue
		keys.add(key)
	}
	return keys
}

function getCloudinaryUrl({
	cloudName,
	kind,
	key,
}: {
	cloudName: string
	kind: MediaKind
	key: string
}) {
	const encodedPath = key
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/')
	return `https://res.cloudinary.com/${cloudName}/${kind}/upload/${encodedPath}`
}

async function downloadCloudinaryAsset({
	cloudName,
	kind,
	key,
}: {
	cloudName: string
	kind: MediaKind
	key: string
}) {
	const primaryUrl = getCloudinaryUrl({ cloudName, kind, key })
	const tryUrls =
		kind === 'video' && !/\.[a-z0-9]+$/i.test(key)
			? [primaryUrl, `${primaryUrl}.mp4`]
			: [primaryUrl]

	let lastError: Error | null = null
	for (const url of tryUrls) {
		try {
			const response = await fetch(url)
			if (!response.ok) {
				lastError = new Error(`HTTP ${response.status} for ${url}`)
				continue
			}
			return new Uint8Array(await response.arrayBuffer())
		} catch (error: unknown) {
			lastError = error instanceof Error ? error : new Error(String(error))
		}
	}

	throw (
		lastError ??
		new Error(`Failed to download ${kind} asset for key "${key}"`)
	)
}

function checksumBytes(bytes: Uint8Array) {
	return createHash('sha256').update(bytes).digest('hex')
}

async function ensureAssetWritten({
	key,
	bytes,
	dryRun,
}: {
	key: string
	bytes: Uint8Array
	dryRun: boolean
}) {
	const outputPath = path.join(contentRootDirectory, key)
	if (dryRun) return outputPath
	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, bytes)
	return outputPath
}

async function syncKind({
	kind,
	keys,
	manifest,
	options,
}: {
	kind: MediaKind
	keys: ReadonlyArray<string>
	manifest: MediaManifest
	options: CliOptions
}) {
	const toProcess = options.limit ? keys.slice(0, options.limit) : keys
	let downloaded = 0
	let skipped = 0
	let failed = 0

	for (const key of toProcess) {
		if (!isSafeKey(key)) continue
		const sourcePath = `content/${key}`
		if (!options.dryRun && manifest.assets[key]) {
			const exists = await fs
				.stat(path.join(process.cwd(), sourcePath))
				.then(() => true)
				.catch(() => false)
			if (exists) {
				skipped += 1
				continue
			}
		}

		try {
			const bytes = await downloadCloudinaryAsset({
				cloudName: options.cloudName,
				kind,
				key,
			})
			await ensureAssetWritten({ key, bytes, dryRun: options.dryRun })
			const checksum = checksumBytes(bytes)
			manifest.assets[key] = {
				id: key,
				checksum,
				sourcePath,
				uploadedAt: new Date().toISOString(),
			}
			downloaded += 1
			console.log(`${options.dryRun ? '[dry-run] ' : ''}${kind}: ${key}`)
		} catch (error: unknown) {
			failed += 1
			console.warn(
				`${options.dryRun ? '[dry-run] ' : ''}failed ${kind}: ${key} (${error instanceof Error ? error.message : String(error)})`,
			)
		}
	}

	return { downloaded, skipped, failed, processed: toProcess.length }
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const [{ imageKeys: contentImageKeys, videoKeys: contentVideoKeys }, imageIds, kifsVideoIds] =
		await Promise.all([
			collectContentMediaKeys(),
			collectImageComponentKeys(),
			collectKifsVideoKeys(),
		])

	const allImageKeys = [...new Set([...contentImageKeys, ...imageIds])].sort()
	const allVideoKeys = [...new Set([...contentVideoKeys, ...kifsVideoIds])].sort()

	console.log(`image keys: ${allImageKeys.length}`)
	console.log(`video keys: ${allVideoKeys.length}`)

	const [imageManifest, videoManifest] = await Promise.all([
		readManifest(imageManifestPath),
		readManifest(videoManifestPath),
	])
	for (const [key, asset] of Object.entries(imageManifest.assets)) {
		if (!isVideoKey(key)) continue
		videoManifest.assets[key] = { ...asset, sourcePath: `content/${key}` }
		delete imageManifest.assets[key]
	}
	for (const [key, asset] of Object.entries(videoManifest.assets)) {
		if (isVideoKey(key)) continue
		imageManifest.assets[key] = { ...asset, sourcePath: `content/${key}` }
		delete videoManifest.assets[key]
	}

	const imageResult = await syncKind({
		kind: 'image',
		keys: allImageKeys,
		manifest: imageManifest,
		options,
	})
	const videoResult = await syncKind({
		kind: 'video',
		keys: allVideoKeys,
		manifest: videoManifest,
		options,
	})

	console.log(
		`images processed=${imageResult.processed} downloaded=${imageResult.downloaded} skipped=${imageResult.skipped} failed=${imageResult.failed}`,
	)
	console.log(
		`videos processed=${videoResult.processed} downloaded=${videoResult.downloaded} skipped=${videoResult.skipped} failed=${videoResult.failed}`,
	)

	if (!options.dryRun) {
		await Promise.all([
			writeManifest(imageManifestPath, imageManifest),
			writeManifest(videoManifestPath, videoManifest),
		])
		console.log('updated manifests:')
		console.log(`- ${path.relative(process.cwd(), imageManifestPath)}`)
		console.log(`- ${path.relative(process.cwd(), videoManifestPath)}`)
	}
}

main().catch((error: unknown) => {
	console.error(error)
	process.exitCode = 1
})
