import fs from 'node:fs/promises'
import path from 'node:path'

export type LegacyReferenceRule = {
	id: string
	description: string
	pattern: RegExp
}

export type LegacyReferenceMatch = {
	ruleId: string
	ruleDescription: string
	filePath: string
	line: number
	column: number
	text: string
}

const scannedDirectories = ['content', 'app', 'other'] as const

const includedExtensions = new Set([
	'.mdx',
	'.md',
	'.yml',
	'.yaml',
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
])

const ignoredPathSegments = new Set([
	'node_modules',
	'build',
	'server-build',
	'public/build',
	'.git',
	'coverage',
])

const defaultRules: Array<LegacyReferenceRule> = [
	{
		id: 'cloudinary-host',
		description: 'Legacy Cloudinary delivery host reference',
		pattern: /res\.cloudinary\.com/g,
	},
	{
		id: 'cloudinary-field',
		description: 'Legacy Cloudinary ID field usage',
		pattern: /\b(?:bannerCloudinaryId|cloudinaryId)\b/g,
	},
	{
		id: 'cloudinary-video-component',
		description: 'Legacy Cloudinary video component usage',
		pattern: /\bCloudinaryVideo\b/g,
	},
	{
		id: 'cloudinary-builder',
		description: 'Legacy cloudinary-build-url package usage',
		pattern: /\bcloudinary-build-url\b/g,
	},
]

type ScanOptions = {
	strict: boolean
	json: boolean
}

function parseArgs(): ScanOptions {
	const args = new Set(process.argv.slice(2))
	return {
		strict: args.has('--strict'),
		json: args.has('--json'),
	}
}

function shouldIgnorePath(filePath: string) {
	return [...ignoredPathSegments].some((segment) =>
		filePath.replace(/\\/g, '/').includes(segment),
	)
}

async function collectScannableFiles(
	rootDirectory: string,
): Promise<Array<string>> {
	const files: Array<string> = []
	const rootPath = path.join(process.cwd(), rootDirectory)
	const stack: Array<string> = [rootPath]
	while (stack.length) {
		const currentPath = stack.pop()
		if (!currentPath) continue
		const relativeCurrentPath = path.relative(process.cwd(), currentPath)
		if (shouldIgnorePath(relativeCurrentPath)) continue
		const entries = await fs.readdir(currentPath, { withFileTypes: true })
		for (const entry of entries) {
			const absoluteEntryPath = path.join(currentPath, entry.name)
			const relativeEntryPath = path.relative(process.cwd(), absoluteEntryPath)
			if (shouldIgnorePath(relativeEntryPath)) continue
			if (entry.isDirectory()) {
				stack.push(absoluteEntryPath)
				continue
			}
			if (!entry.isFile()) continue
			const extension = path.extname(entry.name).toLowerCase()
			if (!includedExtensions.has(extension)) continue
			files.push(relativeEntryPath.replace(/\\/g, '/'))
		}
	}
	return files.sort()
}

function getLineAndColumn(source: string, matchIndex: number) {
	let line = 1
	let column = 1
	for (let i = 0; i < matchIndex; i += 1) {
		const character = source[i]
		if (character === '\n') {
			line += 1
			column = 1
		} else {
			column += 1
		}
	}
	return { line, column }
}

export function scanFileContents({
	filePath,
	source,
	rules = defaultRules,
}: {
	filePath: string
	source: string
	rules?: Array<LegacyReferenceRule>
}): Array<LegacyReferenceMatch> {
	const matches: Array<LegacyReferenceMatch> = []
	for (const rule of rules) {
		for (const match of source.matchAll(rule.pattern)) {
			const matchText = match[0]
			const index = match.index
			if (typeof index !== 'number') continue
			const { line, column } = getLineAndColumn(source, index)
			matches.push({
				ruleId: rule.id,
				ruleDescription: rule.description,
				filePath,
				line,
				column,
				text: matchText,
			})
		}
	}
	return matches
}

function formatMatch(match: LegacyReferenceMatch) {
	return `${match.filePath}:${match.line}:${match.column} [${match.ruleId}] ${match.text}`
}

async function main() {
	const options = parseArgs()
	const allFiles = (
		await Promise.all(
			scannedDirectories.map((directory) => collectScannableFiles(directory)),
		)
	).flat()
	const allMatches: Array<LegacyReferenceMatch> = []
	for (const filePath of allFiles) {
		const source = await fs.readFile(path.join(process.cwd(), filePath), 'utf8')
		allMatches.push(...scanFileContents({ filePath, source }))
	}

	if (options.json) {
		console.log(
			JSON.stringify(
				{
					totalFilesScanned: allFiles.length,
					totalMatches: allMatches.length,
					matches: allMatches,
				},
				null,
				2,
			),
		)
	} else if (!allMatches.length) {
		console.log(
			`No legacy media references found across ${allFiles.length} scanned files.`,
		)
	} else {
		console.log(
			`Found ${allMatches.length} legacy media references across ${allFiles.length} scanned files:`,
		)
		for (const match of allMatches) {
			console.log(formatMatch(match))
		}
	}

	if (options.strict && allMatches.length > 0) {
		process.exitCode = 1
	}
}

const isEntrypoint = Boolean(
	process.argv[1]?.endsWith('scan-legacy-media-references.ts'),
)

if (isEntrypoint) {
	main().catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
}
