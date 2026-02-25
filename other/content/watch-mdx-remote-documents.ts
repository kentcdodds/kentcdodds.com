import { rm } from 'node:fs/promises'
import path from 'node:path'
import chokidar from 'chokidar'
import { compileMdxRemoteDocuments } from './compile-mdx-remote-documents.ts'

type CliOptions = {
	contentDirectory: string
	outputDirectory: string
	once: boolean
}

function parseArgs(argv: Array<string>): CliOptions {
	const options: CliOptions = {
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		once: false,
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
			case '--once':
				options.once = true
				break
			default:
				if (arg.startsWith('-')) {
					throw new Error(`Unknown argument: ${arg}`)
				}
		}
	}

	return options
}

async function rebuildArtifacts(options: CliOptions) {
	const outputDirectory = path.resolve(options.outputDirectory)
	await rm(outputDirectory, { recursive: true, force: true })
	const { compiledEntries } = await compileMdxRemoteDocuments({
		contentDirectory: options.contentDirectory,
		outputDirectory: options.outputDirectory,
		dryRun: false,
		collections: ['blog', 'pages', 'writing-blog'],
		strictComponentValidation: true,
		strictExpressionValidation: true,
		continueOnError: false,
	})
	console.log(`Rebuilt ${compiledEntries.length} mdx-remote artifacts`)
}

async function watchMdxRemoteDocuments(options: CliOptions) {
	await rebuildArtifacts(options)
	if (options.once) return

	const watcher = chokidar.watch(
		[
			path.join(options.contentDirectory, 'blog'),
			path.join(options.contentDirectory, 'pages'),
			path.join(options.contentDirectory, 'writing-blog'),
		],
		{
			ignoreInitial: true,
		},
	)

	let rebuildTimer: ReturnType<typeof setTimeout> | null = null
	let rebuilding = false
	let queued = false

	async function runRebuild() {
		if (rebuilding) {
			queued = true
			return
		}
		rebuilding = true
		try {
			await rebuildArtifacts(options)
		} catch (error: unknown) {
			console.error('Failed to rebuild mdx-remote artifacts', error)
		} finally {
			rebuilding = false
			if (queued) {
				queued = false
				await runRebuild()
			}
		}
	}

	function scheduleRebuild() {
		if (rebuildTimer) {
			clearTimeout(rebuildTimer)
		}
		rebuildTimer = setTimeout(() => {
			rebuildTimer = null
			void runRebuild()
		}, 150)
	}

	watcher.on('add', scheduleRebuild)
	watcher.on('change', scheduleRebuild)
	watcher.on('unlink', scheduleRebuild)
	watcher.on('error', (error) => {
		console.error('mdx-remote watcher error', error)
	})

	const closeWatcher = async () => {
		await watcher.close()
	}

	process.on('SIGINT', () => {
		void closeWatcher().finally(() => {
			process.exit(0)
		})
	})
	process.on('SIGTERM', () => {
		void closeWatcher().finally(() => {
			process.exit(0)
		})
	})

	console.log(
		`Watching ${options.contentDirectory}/{blog,pages,writing-blog} for mdx-remote updates...`,
	)
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	await watchMdxRemoteDocuments(options)
}

if (process.argv[1]?.endsWith('watch-mdx-remote-documents.ts')) {
	main().catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
}

export { parseArgs, rebuildArtifacts, watchMdxRemoteDocuments }
export type { CliOptions }
