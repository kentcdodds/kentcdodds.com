import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import chokidar from 'chokidar'
import { compileMdxRemoteDocuments } from './compile-mdx-remote-documents.ts'

type CliOptions = {
	contentDirectory: string
	outputDirectory: string
	once: boolean
	syncUrl: string | null
	syncToken: string | null
}

function parseArgs(argv: Array<string>): CliOptions {
	const defaultSyncPort = process.env.PORT ?? '3000'
	const options: CliOptions = {
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		once: false,
		syncUrl:
			process.env.MDX_REMOTE_SYNC_URL ??
			`http://localhost:${defaultSyncPort}/resources/mdx-remote-sync`,
		syncToken: process.env.INTERNAL_COMMAND_TOKEN ?? null,
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
			case '--sync-url':
				options.syncUrl = argv[index + 1] ?? options.syncUrl
				index += 1
				break
			case '--sync-token':
				options.syncToken = argv[index + 1] ?? options.syncToken
				index += 1
				break
			case '--no-sync':
				options.syncUrl = null
				break
			default:
				if (arg.startsWith('-')) {
					throw new Error(`Unknown argument: ${arg}`)
				}
		}
	}

	return options
}

type ArtifactSnapshot = Map<string, string>

type ArtifactDiff = {
	upserts: Array<{ key: string; value: string }>
	deletes: Array<string>
}

async function rebuildArtifacts(options: CliOptions) {
	const outputDirectory = path.resolve(options.outputDirectory)
	await rm(outputDirectory, { recursive: true, force: true })
	const result = await compileMdxRemoteDocuments({
		contentDirectory: options.contentDirectory,
		outputDirectory: options.outputDirectory,
		dryRun: false,
		collections: ['blog', 'pages', 'writing-blog'],
		strictComponentValidation: true,
		strictExpressionValidation: true,
		continueOnError: false,
	})
	const nextSnapshot = await readArtifactSnapshot(result)
	console.log(`Rebuilt ${result.compiledEntries.length} mdx-remote artifacts`)
	return nextSnapshot
}

async function readArtifactSnapshot({
	compiledEntries,
	manifestPath,
}: {
	compiledEntries: Array<{ collection: string; slug: string; outputPath: string }>
	manifestPath: string
}) {
	const snapshot: ArtifactSnapshot = new Map()
	for (const entry of compiledEntries) {
		const value = await readFile(entry.outputPath, 'utf8')
		snapshot.set(`${entry.collection}/${entry.slug}.json`, value)
	}
	const manifestValue = await readFile(manifestPath, 'utf8')
	snapshot.set('manifest.json', manifestValue)
	return snapshot
}

function buildArtifactDiff({
	previous,
	next,
}: {
	previous: ArtifactSnapshot
	next: ArtifactSnapshot
}) {
	const upserts: Array<{ key: string; value: string }> = []
	const deletes: Array<string> = []

	for (const [key, value] of next.entries()) {
		if (previous.get(key) !== value) {
			upserts.push({ key, value })
		}
	}

	for (const key of previous.keys()) {
		if (!next.has(key)) {
			deletes.push(key)
		}
	}

	return { upserts, deletes } satisfies ArtifactDiff
}

async function syncArtifactDiff({
	diff,
	options,
}: {
	diff: ArtifactDiff
	options: CliOptions
}) {
	if (diff.upserts.length === 0 && diff.deletes.length === 0) return
	if (!options.syncUrl) return
	if (!options.syncToken) {
		console.warn('Skipping mdx-remote KV sync because INTERNAL_COMMAND_TOKEN is unset.')
		return
	}

	const response = await fetch(options.syncUrl, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${options.syncToken}`,
		},
		body: JSON.stringify(diff),
	})
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`mdx-remote sync failed (${response.status}): ${text || response.statusText}`,
		)
	}
	console.log(
		`Synced mdx-remote artifacts (${diff.upserts.length} upserts, ${diff.deletes.length} deletes)`,
	)
}

async function watchMdxRemoteDocuments(options: CliOptions) {
	let previousSnapshot: ArtifactSnapshot = new Map()

	const runRebuild = async () => {
		const nextSnapshot = await rebuildArtifacts(options)
		const diff = buildArtifactDiff({
			previous: previousSnapshot,
			next: nextSnapshot,
		})
		await syncArtifactDiff({ diff, options })
		previousSnapshot = nextSnapshot
	}

	await runRebuild()
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

	async function runQueuedRebuild() {
		if (rebuilding) {
			queued = true
			return
		}
		rebuilding = true
		try {
			await runRebuild()
		} catch (error: unknown) {
			console.error('Failed to rebuild mdx-remote artifacts', error)
		} finally {
			rebuilding = false
			if (queued) {
				queued = false
				await runQueuedRebuild()
			}
		}
	}

	function scheduleRebuild() {
		if (rebuildTimer) {
			clearTimeout(rebuildTimer)
		}
		rebuildTimer = setTimeout(() => {
			rebuildTimer = null
			void runQueuedRebuild()
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
