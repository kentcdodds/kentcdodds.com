import fs from 'node:fs/promises'
import path from 'node:path'

const legacyMediaUploadPathRegex =
	/\/media\/(?:(?<cloudName>[^/\s"'()]+)\/)?(?<kind>image|video)\/upload\/(?:(?<transforms>(?:[^/\s"'()]*_[^/\s"'()]*(?:,[^/\s"'()]*_[^/\s"'()]*)*))\/)?(?:v\d+\/)?(?<publicId>[^?\s"'()]+(?:\/[^?\s"'()]+)*)/g

type CliOptions = {
	dryRun: boolean
	targetDirectory: string
}

function parseArgs(argv: Array<string>): CliOptions {
	const options: CliOptions = {
		dryRun: false,
		targetDirectory: 'content',
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
			case '--dry-run':
				options.dryRun = true
				break
			case '--target-directory':
				options.targetDirectory = argv[index + 1] ?? options.targetDirectory
				index += 1
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
		files.push(normalizePath(absolutePath))
	}
	return files
}

function getDefaultImageTransforms(publicId: string) {
	return ['f_auto', 'q_auto', publicId.endsWith('.gif') ? '' : 'dpr_2.0', 'w_1600']
		.filter(Boolean)
		.join(',')
}

function buildMediaReplacement({
	kind,
	transforms,
	publicId,
}: {
	kind: 'image' | 'video'
	transforms?: string
	publicId: string
}) {
	if (kind === 'video') {
		const streamPath = /\.[a-z0-9]+$/i.test(publicId) ? publicId : `${publicId}.mp4`
		if (transforms) return `/stream/${streamPath}?tr=${transforms}`
		return `/stream/${streamPath}`
	}
	const finalTransforms = transforms || getDefaultImageTransforms(publicId)
	const basePath = `/media/${publicId}`
	return finalTransforms ? `${basePath}?tr=${finalTransforms}` : basePath
}

function transformLegacyMediaPathsInText(source: string) {
	let didChange = false
	const updatedSource = source.replace(
		legacyMediaUploadPathRegex,
		(fullMatch, _cloudName, kind, transforms, publicId) => {
			if (!kind || !publicId) return fullMatch
			didChange = true
			return buildMediaReplacement({
				kind: kind as 'image' | 'video',
				transforms: transforms || undefined,
				publicId,
			})
		},
	)
	return { updatedSource, didChange }
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const targetDirectory = path.resolve(process.cwd(), options.targetDirectory)
	const allFiles = await walkFiles(targetDirectory)
	const textFiles = allFiles.filter((filePath) =>
		/\.(md|mdx|txt|html|yml|yaml)$/i.test(filePath),
	)

	let changedFilesCount = 0
	for (const filePath of textFiles) {
		const source = await fs.readFile(filePath, 'utf8')
		const { updatedSource, didChange } = transformLegacyMediaPathsInText(source)
		if (!didChange) continue
		changedFilesCount += 1
		if (!options.dryRun) {
			await fs.writeFile(filePath, updatedSource, 'utf8')
		}
	}

	console.log(
		`${options.dryRun ? '[dry-run] ' : ''}normalized legacy media paths in ${changedFilesCount} file(s)`,
	)
}

if (process.argv[1]?.endsWith('normalize-legacy-media-paths.ts')) {
	main().catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
}

export {
	buildMediaReplacement,
	getDefaultImageTransforms,
	parseArgs,
	transformLegacyMediaPathsInText,
}
