import fs from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
	compileMdxRemoteDocumentFromSource,
} from '#app/mdx-remote/compiler/from-mdast.ts'
import { serializeMdxRemoteDocument } from '#app/mdx-remote/compiler/serialize.ts'
import { mdxRemoteComponentAllowlist } from '#app/mdx-remote/component-allowlist.ts'

const supportedCollections = new Set(['blog', 'pages', 'writing-blog'])

type CliOptions = {
	contentDirectory: string
	outputDirectory: string
	dryRun: boolean
	collections: Array<string>
	strictComponentValidation: boolean
	strictExpressionValidation: boolean
	continueOnError: boolean
}

type FrontmatterParseResult = {
	frontmatter: Record<string, unknown>
	body: string
}

type CompiledEntry = {
	slug: string
	collection: string
	outputPath: string
}

type FailedEntry = {
	slug: string
	collection: string
	filePath: string
	errorMessage: string
}

function parseArgs(argv: Array<string>): CliOptions {
	const options: CliOptions = {
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		dryRun: false,
		collections: [...supportedCollections],
		strictComponentValidation: false,
		strictExpressionValidation: false,
		continueOnError: false,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
			case '--content-directory':
				options.contentDirectory = argv[index + 1] ?? options.contentDirectory
				index += 1
				break
			case '--output-directory':
				options.outputDirectory = argv[index + 1] ?? options.outputDirectory
				index += 1
				break
			case '--collection': {
				const collection = argv[index + 1]
				index += 1
				if (!collection) {
					throw new Error('Missing value for --collection')
				}
				if (!supportedCollections.has(collection)) {
					throw new Error(`Unsupported collection: ${collection}`)
				}
				options.collections = [collection]
				break
			}
			case '--dry-run':
				options.dryRun = true
				break
			case '--strict':
				options.strictComponentValidation = true
				options.strictExpressionValidation = true
				break
			case '--strict-components':
				options.strictComponentValidation = true
				break
			case '--strict-expressions':
				options.strictExpressionValidation = true
				break
			case '--continue-on-error':
				options.continueOnError = true
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
		files.push(absolutePath)
	}
	return files
}

function parseFrontmatter(source: string): FrontmatterParseResult {
	if (!source.startsWith('---\n')) {
		return { frontmatter: {}, body: source }
	}
	const closingMarkerIndex = source.indexOf('\n---\n', 4)
	if (closingMarkerIndex === -1) {
		return { frontmatter: {}, body: source }
	}
	const frontmatterSource = source.slice(4, closingMarkerIndex)
	const body = source.slice(closingMarkerIndex + '\n---\n'.length)
	const frontmatter = parseYaml(frontmatterSource) as Record<string, unknown> | null
	return {
		frontmatter: frontmatter ?? {},
		body,
	}
}

function getCollectionFromPath(relativeFilePath: string) {
	const [collection] = normalizePath(relativeFilePath).split('/')
	if (!collection || !supportedCollections.has(collection)) {
		throw new Error(`Unable to infer collection from path: ${relativeFilePath}`)
	}
	return collection
}

function getSlugFromPath(relativeFilePath: string) {
	const normalizedPath = normalizePath(relativeFilePath)
	return normalizedPath
		.replace(/^[^/]+\//, '')
		.replace(/\/index\.mdx?$/, '')
}

function getOutputPath({
	outputDirectory,
	collection,
	slug,
}: {
	outputDirectory: string
	collection: string
	slug: string
}) {
	return path.resolve(outputDirectory, collection, `${slug}.json`)
}

async function compileMdxRemoteDocuments(options: CliOptions) {
	const contentDirectory = path.resolve(options.contentDirectory)
	const outputDirectory = path.resolve(options.outputDirectory)
	const allFiles = await walkFiles(contentDirectory)
	const mdxFiles = allFiles
		.map((absolutePath) => ({
			absolutePath,
			relativePath: normalizePath(path.relative(contentDirectory, absolutePath)),
		}))
		.filter(({ relativePath }) => /\/index\.mdx?$/.test(relativePath))
		.filter(({ relativePath }) =>
			options.collections.includes(getCollectionFromPath(relativePath)),
		)

	const compiledEntries: Array<CompiledEntry> = []
	const failedEntries: Array<FailedEntry> = []
	for (const file of mdxFiles) {
		const source = await fs.readFile(file.absolutePath, 'utf8')
		const { frontmatter, body } = parseFrontmatter(source)
		const collection = getCollectionFromPath(file.relativePath)
		const slug = getSlugFromPath(file.relativePath)
		let document
		try {
			document = await compileMdxRemoteDocumentFromSource({
				slug,
				source: body,
				frontmatter,
				allowedComponentNames: mdxRemoteComponentAllowlist,
				strictComponentValidation: options.strictComponentValidation,
				strictExpressionValidation: options.strictExpressionValidation,
			})
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : `Unknown error: ${String(error)}`
			if (!options.continueOnError) {
				throw new Error(
					`Failed to compile mdx-remote document "${collection}/${slug}": ${errorMessage}`,
				)
			}
			failedEntries.push({
				slug,
				collection,
				filePath: file.relativePath,
				errorMessage,
			})
			continue
		}
		const outputPath = getOutputPath({ outputDirectory, collection, slug })
		compiledEntries.push({
			slug,
			collection,
			outputPath,
		})
		if (!options.dryRun) {
			await fs.mkdir(path.dirname(outputPath), { recursive: true })
			await fs.writeFile(outputPath, `${serializeMdxRemoteDocument(document)}\n`, 'utf8')
		}
	}

	const manifest = {
		generatedAt: new Date().toISOString(),
		count: compiledEntries.length,
		entries: compiledEntries.map(({ collection, slug, outputPath }) => ({
			collection,
			slug,
			outputPath: normalizePath(path.relative(process.cwd(), outputPath)),
		})),
	}

	const manifestPath = path.resolve(outputDirectory, 'manifest.json')
	if (!options.dryRun) {
		await fs.mkdir(path.dirname(manifestPath), { recursive: true })
		await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
	}

	return {
		compiledEntries,
		failedEntries,
		manifestPath,
		dryRun: options.dryRun,
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const result = await compileMdxRemoteDocuments(options)
	if (result.failedEntries.length > 0) {
		console.error(
			`failed ${result.failedEntries.length} mdx-remote documents:`,
			result.failedEntries
				.map(
					(entry) =>
						`${entry.collection}/${entry.slug} (${entry.filePath}) — ${entry.errorMessage}`,
				)
				.join('\n'),
		)
		process.exitCode = 1
	}
	console.log(
		`${result.dryRun ? '[dry-run] ' : ''}compiled ${result.compiledEntries.length} mdx-remote documents`,
	)
	console.log(`manifest: ${normalizePath(path.relative(process.cwd(), result.manifestPath))}`)
}

if (process.argv[1]?.endsWith('compile-mdx-remote-documents.ts')) {
	main().catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
}

export {
	compileMdxRemoteDocuments,
	getCollectionFromPath,
	getOutputPath,
	getSlugFromPath,
	parseArgs,
	parseFrontmatter,
}

export type { CliOptions, CompiledEntry, FailedEntry }
