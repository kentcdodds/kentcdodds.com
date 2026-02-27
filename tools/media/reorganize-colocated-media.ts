import fs from 'node:fs/promises'
import path from 'node:path'

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

const workspaceRoot = process.cwd()
const contentRoot = path.join(workspaceRoot, 'content')

const manifestPaths = [
	path.join(workspaceRoot, 'content/data/media-manifests/images.json'),
	path.join(workspaceRoot, 'content/data/media-manifests/videos.json'),
]

const contentFileRegex = /\.(mdx|md|yml|yaml)$/i

function rewriteKey(key: string) {
	if (key.startsWith('kentcdodds.com/content/blog/')) {
		return `blog/${key.slice('kentcdodds.com/content/blog/'.length)}`
	}
	if (key.startsWith('kentcdodds.com/blog/')) {
		return `blog/${key.slice('kentcdodds.com/blog/'.length)}`
	}
	if (key.startsWith('kentcdodds.com/content/writing-blog/')) {
		return `writing-blog/${key.slice('kentcdodds.com/content/writing-blog/'.length)}`
	}
	if (key.startsWith('kentcdodds.com/content/pages/')) {
		return `pages/${key.slice('kentcdodds.com/content/pages/'.length)}`
	}
	return key
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
		if (entry.isFile()) files.push(absolutePath)
	}
	return files
}

async function readManifest(filePath: string): Promise<MediaManifest> {
	const source = await fs.readFile(filePath, 'utf8')
	return JSON.parse(source) as MediaManifest
}

async function writeManifest(filePath: string, manifest: MediaManifest) {
	await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function fileBytes(filePath: string) {
	return fs.readFile(filePath)
}

async function moveMediaFiles() {
	const files = await walkFiles(contentRoot)
	let movedCount = 0
	for (const absolutePath of files) {
		const relativePath = path
			.relative(contentRoot, absolutePath)
			.replace(/\\/g, '/')
		const rewritten = rewriteKey(relativePath)
		if (rewritten === relativePath) continue

		const destinationPath = path.join(contentRoot, rewritten)
		await fs.mkdir(path.dirname(destinationPath), { recursive: true })

		const destinationExists = await fs
			.stat(destinationPath)
			.then((stats) => stats.isFile())
			.catch(() => false)
		if (destinationExists) {
			const [sourceBytes, destinationBytes] = await Promise.all([
				fileBytes(absolutePath),
				fileBytes(destinationPath),
			])
			if (Buffer.compare(sourceBytes, destinationBytes) !== 0) {
				throw new Error(
					`File collision while reorganizing media: ${relativePath} -> ${rewritten}`,
				)
			}
			await fs.unlink(absolutePath)
		} else {
			await fs.rename(absolutePath, destinationPath)
		}
		movedCount += 1
	}
	return movedCount
}

async function removeEmptyDirectories(directory: string) {
	const entries = await fs.readdir(directory, { withFileTypes: true })
	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		const absolutePath = path.join(directory, entry.name)
		await removeEmptyDirectories(absolutePath)
	}
	const remaining = await fs.readdir(directory)
	if (remaining.length === 0 && directory !== contentRoot) {
		await fs.rmdir(directory)
	}
}

function shouldRewriteManifestId({
	id,
	key,
	sourcePath,
}: {
	id: string
	key: string
	sourcePath: string
}) {
	return id === key || id === sourcePath || id === `content/${key}`
}

async function rewriteManifests() {
	let rewrittenAssets = 0
	for (const manifestPath of manifestPaths) {
		const manifest = await readManifest(manifestPath)
		const nextAssets: Record<string, MediaManifestAsset> = {}
		for (const [key, asset] of Object.entries(manifest.assets)) {
			const normalizedSourceKey = asset.sourcePath.replace(/^content\//, '')
			const rewrittenKey = rewriteKey(key)
			const rewrittenSourceKey = rewriteKey(normalizedSourceKey)
			const nextId = shouldRewriteManifestId({
				id: asset.id,
				key,
				sourcePath: asset.sourcePath,
			})
				? rewrittenKey
				: asset.id

			const nextAsset: MediaManifestAsset = {
				...asset,
				id: nextId,
				sourcePath: `content/${rewrittenSourceKey}`,
			}
			const existing = nextAssets[rewrittenKey]
			if (existing) {
				if (
					existing.checksum !== nextAsset.checksum ||
					existing.sourcePath !== nextAsset.sourcePath
				) {
					throw new Error(`Manifest key collision for "${rewrittenKey}"`)
				}
				continue
			}
			nextAssets[rewrittenKey] = nextAsset
			if (rewrittenKey !== key || rewrittenSourceKey !== normalizedSourceKey) {
				rewrittenAssets += 1
			}
		}
		await writeManifest(manifestPath, { ...manifest, assets: nextAssets })
	}
	return rewrittenAssets
}

async function rewriteContentReferences() {
	const files = await walkFiles(contentRoot)
	const contentFiles = files.filter((filePath) => contentFileRegex.test(filePath))
	const replacements: Array<[RegExp, string]> = [
		[/\/media\/kentcdodds\.com\/content\/blog\//g, '/media/blog/'],
		[/\/media\/kentcdodds\.com\/blog\//g, '/media/blog/'],
		[/\/media\/kentcdodds\.com\/content\/pages\//g, '/media/pages/'],
		[
			/\/media\/kentcdodds\.com\/content\/writing-blog\//g,
			'/media/writing-blog/',
		],
		[/\/stream\/kentcdodds\.com\/content\/blog\//g, '/stream/blog/'],
		[/\/stream\/kentcdodds\.com\/blog\//g, '/stream/blog/'],
		[/\/stream\/kentcdodds\.com\/content\/pages\//g, '/stream/pages/'],
		[
			/\/stream\/kentcdodds\.com\/content\/writing-blog\//g,
			'/stream/writing-blog/',
		],
	]

	let updatedFiles = 0
	for (const filePath of contentFiles) {
		const original = await fs.readFile(filePath, 'utf8')
		let next = original
		for (const [pattern, replacement] of replacements) {
			next = next.replace(pattern, replacement)
		}
		if (next === original) continue
		await fs.writeFile(filePath, next, 'utf8')
		updatedFiles += 1
	}
	return updatedFiles
}

async function main() {
	const movedCount = await moveMediaFiles()
	await removeEmptyDirectories(path.join(contentRoot, 'kentcdodds.com'))
	const rewrittenAssets = await rewriteManifests()
	const updatedFiles = await rewriteContentReferences()

	console.log(`moved_media_files=${movedCount}`)
	console.log(`rewritten_manifest_assets=${rewrittenAssets}`)
	console.log(`updated_content_files=${updatedFiles}`)
}

main().catch((error: unknown) => {
	console.error(error)
	process.exitCode = 1
})
