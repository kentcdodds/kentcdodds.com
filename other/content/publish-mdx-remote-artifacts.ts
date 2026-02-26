import { execFileSync, execSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
	compileMdxRemoteDocuments,
	type CompiledEntry,
} from './compile-mdx-remote-documents.ts'

type CliOptions = {
	kvBinding: string
	wranglerConfigPath: string
	wranglerEnv: string
	beforeSha?: string
	afterSha?: string
	outputDirectory: string
	dryRun: boolean
}

type ChangedPathSummary = {
	changedEntries: Set<string>
	deletedEntries: Set<string>
}

type PublishPlan = {
	uploadEntries: Array<CompiledEntry>
	deleteKeys: Array<string>
}

type BulkPutEntry = {
	key: string
	value: string
}

type TemporaryJsonFile = {
	path: string
	[Symbol.asyncDispose]: () => Promise<void>
}

const kvBulkGetChunkSize = 100
const kvBulkMutationChunkSize = 1_000

function parseArgs(argv: Array<string>): CliOptions {
	const options: CliOptions = {
		kvBinding: '',
		wranglerConfigPath: 'wrangler.jsonc',
		wranglerEnv: process.env.CLOUDFLARE_ENV ?? 'development',
		outputDirectory: 'other/content/mdx-remote',
		dryRun: false,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
			case '--kv-binding':
				options.kvBinding = argv[index + 1] ?? options.kvBinding
				index += 1
				break
			case '--wrangler-config':
				options.wranglerConfigPath =
					argv[index + 1] ?? options.wranglerConfigPath
				index += 1
				break
			case '--wrangler-env':
				options.wranglerEnv = argv[index + 1] ?? options.wranglerEnv
				index += 1
				break
			case '--before':
				options.beforeSha = argv[index + 1]
				index += 1
				break
			case '--after':
				options.afterSha = argv[index + 1]
				index += 1
				break
			case '--output-directory':
				options.outputDirectory = argv[index + 1] ?? options.outputDirectory
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

	if (!options.kvBinding.trim()) {
		throw new Error('Missing required --kv-binding argument')
	}

	return options
}

function normalizePath(filePath: string) {
	return filePath.replace(/\\/g, '/')
}

function getMdxEntryPathKey(filePath: string): string | null {
	const normalized = normalizePath(filePath)
	const parts = normalized.split('/')
	if (parts[0] !== 'content') return null
	const collection = parts[1]
	if (!collection) return null
	if (collection !== 'blog' && collection !== 'pages' && collection !== 'writing-blog') {
		return null
	}
	const slugSegment = parts[2]
	if (!slugSegment) return null
	const slug = slugSegment.replace(/\.mdx?$/, '')
	return `${collection}:${slug}`
}

function parseNameStatusOutput(output: string): ChangedPathSummary {
	const changedEntries = new Set<string>()
	const deletedEntries = new Set<string>()
	const lines = output.split('\n').filter(Boolean)

	for (const line of lines) {
		const columns = line.split('\t').filter(Boolean)
		const [status = '', sourcePath, targetPath] = columns
		if (!sourcePath) continue
		const statusCode = status[0]
		if (!statusCode) continue

		if (statusCode === 'R' && sourcePath && targetPath) {
			const oldEntry = getMdxEntryPathKey(sourcePath)
			if (oldEntry) deletedEntries.add(oldEntry)
			const newEntry = getMdxEntryPathKey(targetPath)
			if (newEntry) changedEntries.add(newEntry)
			continue
		}

		const entry = getMdxEntryPathKey(sourcePath)
		if (!entry) continue
		if (statusCode === 'D') {
			deletedEntries.add(entry)
			continue
		}
		if (statusCode === 'A' || statusCode === 'M') {
			changedEntries.add(entry)
		}
	}

	return { changedEntries, deletedEntries }
}

function getChangedMdxEntries({
	beforeSha,
	afterSha,
}: {
	beforeSha?: string
	afterSha?: string
}): ChangedPathSummary | null {
	if (!beforeSha || !afterSha) return null
	if (/^0+$/.test(beforeSha)) return null
	if (!canResolveCommit(beforeSha) || !canResolveCommit(afterSha)) {
		console.warn(
			`Unable to resolve one or both git SHAs for incremental mdx publish. Falling back to full publish (before=${beforeSha}, after=${afterSha}).`,
		)
		return null
	}
	try {
		const diffOutput = execFileSync(
			'git',
			[
				'diff',
				'--name-status',
				beforeSha,
				afterSha,
				'--',
				'content/blog',
				'content/pages',
				'content/writing-blog',
			],
			{ encoding: 'utf8' },
		)
		return parseNameStatusOutput(diffOutput)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.warn(
			`Failed to compute incremental mdx diff. Falling back to full publish. ${message}`,
		)
		return null
	}
}

function canResolveCommit(sha: string) {
	try {
		execSync(`git cat-file -e ${sha}^{commit}`, { stdio: 'ignore' })
		return true
	} catch {
		return false
	}
}

function toEntryKey({
	collection,
	slug,
}: {
	collection: string
	slug: string
}) {
	return `${collection}:${slug}`
}

function toArtifactKey({
	collection,
	slug,
}: {
	collection: string
	slug: string
}) {
	return `${collection}/${slug}.json`
}

function buildPublishPlan({
	compiledEntries,
	changedSummary,
}: {
	compiledEntries: Array<CompiledEntry>
	changedSummary: ChangedPathSummary | null
}): PublishPlan {
	if (!changedSummary) {
		return {
			uploadEntries: compiledEntries,
			deleteKeys: [],
		}
	}

	const uploadEntries = compiledEntries.filter((entry) =>
		changedSummary.changedEntries.has(toEntryKey(entry)),
	)
	const deleteKeys = Array.from(changedSummary.deletedEntries)
		.filter((entryKey) => !changedSummary.changedEntries.has(entryKey))
		.map((entryKey) => {
			const [collection, slug] = entryKey.split(':')
			return toArtifactKey({
				collection: collection ?? '',
				slug: slug ?? '',
			})
		})
		.filter(Boolean)

	return { uploadEntries, deleteKeys }
}

function getWranglerCommandPrefix() {
	const wranglerPackage = process.env.WRANGLER_BUNX_PACKAGE ?? 'wrangler@4.67.0'
	return {
		command: 'bunx',
		args: [wranglerPackage],
	}
}

function isRetryableWranglerFailure(output: string) {
	const lower = output.toLowerCase()
	const has5xxStatusCode = /\b5\d{2}\b/.test(lower)
	return (
		lower.includes('timed out') ||
		lower.includes('timeout') ||
		lower.includes('temporarily unavailable') ||
		lower.includes('internal error') ||
		lower.includes('econnreset') ||
		lower.includes('etimedout') ||
		lower.includes('fetch failed') ||
		lower.includes('network error') ||
		lower.includes('connection reset') ||
		lower.includes('429') ||
		lower.includes('rate limit') ||
		lower.includes('malformed response') ||
		lower.includes('gateway timeout') ||
		lower.includes('5xx') ||
		has5xxStatusCode
	)
}

function sleepSync(durationMs: number) {
	const shared = new SharedArrayBuffer(4)
	const view = new Int32Array(shared)
	Atomics.wait(view, 0, 0, durationMs)
}

function getCommandErrorOutput(error: unknown) {
	if (!error || typeof error !== 'object') {
		return String(error)
	}
	const output = error as { stdout?: unknown; stderr?: unknown; message?: unknown }
	const stderr =
		typeof output.stderr === 'string'
			? output.stderr
			: Buffer.isBuffer(output.stderr)
				? output.stderr.toString('utf8')
				: ''
	const stdout =
		typeof output.stdout === 'string'
			? output.stdout
			: Buffer.isBuffer(output.stdout)
				? output.stdout.toString('utf8')
				: ''
	const message =
		typeof output.message === 'string' ? output.message : String(output.message)
	return `${stderr}\n${stdout}\n${message}`.trim()
}

function runWranglerCommand(
	args: Array<string>,
	{ captureOutput = false }: { captureOutput?: boolean } = {},
) {
	const { command, args: commandArgs } = getWranglerCommandPrefix()
	const maxAttempts = 4
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			const output = execFileSync(command, [...commandArgs, ...args], {
				env: process.env,
				stdio: captureOutput ? 'pipe' : 'inherit',
				encoding: captureOutput ? 'utf8' : undefined,
			})
			return typeof output === 'string' ? output : ''
		} catch (error) {
			const errorOutput = getCommandErrorOutput(error)
			const canRetry =
				attempt < maxAttempts && isRetryableWranglerFailure(errorOutput)
			if (!canRetry) {
				throw error
			}

			const backoffMs = 2 ** attempt * 1000
			console.warn(
				`Wrangler command failed (attempt ${attempt}/${maxAttempts}); retrying in ${backoffMs}ms.`,
			)
			sleepSync(backoffMs)
		}
	}
	return ''
}

async function createTemporaryJsonFile({
	data,
	prefix,
}: {
	data: unknown
	prefix: string
}): Promise<TemporaryJsonFile> {
	const directory = await mkdtemp(path.join(os.tmpdir(), `${prefix}-`))
	const filePath = path.join(directory, 'payload.json')
	await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
	return {
		path: filePath,
		async [Symbol.asyncDispose]() {
			await rm(directory, { recursive: true, force: true })
		},
	}
}

function extractJsonObject(text: string) {
	const start = text.indexOf('{')
	const end = text.lastIndexOf('}')
	if (start < 0 || end < start) return null
	try {
		return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
	} catch {
		return null
	}
}

function filterChangedBulkEntries({
	bulkEntries,
	existingValues,
}: {
	bulkEntries: Array<BulkPutEntry>
	existingValues: Record<string, string | null>
}) {
	return bulkEntries.filter(
		(entry) => existingValues[entry.key] !== entry.value,
	)
}

function chunkArray<T>(items: Array<T>, size: number) {
	if (size < 1) return [items]
	const chunks: Array<Array<T>> = []
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size))
	}
	return chunks
}

async function getExistingBulkValues({
	kvBinding,
	wranglerConfigPath,
	wranglerEnv,
	keys,
	dryRun,
}: {
	kvBinding: string
	wranglerConfigPath: string
	wranglerEnv: string
	keys: Array<string>
	dryRun: boolean
}) {
	if (keys.length === 0 || dryRun) return {}
	const values: Record<string, string | null> = {}
	for (const keyChunk of chunkArray(keys, kvBulkGetChunkSize)) {
		await using temporaryJsonFile = await createTemporaryJsonFile({
			data: keyChunk,
			prefix: 'mdx-remote-bulk-get',
		})
		const output = runWranglerCommand(
			[
				'kv',
				'bulk',
				'get',
				temporaryJsonFile.path,
				'--binding',
				kvBinding,
				'--remote',
				'--config',
				wranglerConfigPath,
				'--env',
				wranglerEnv,
				'--preview',
				'false',
			],
			{ captureOutput: true },
		)
		const parsed = extractJsonObject(output ?? '')
		if (!parsed) {
			throw new Error(`Failed to parse wrangler kv bulk get output:\n${output}`)
		}
		for (const key of keyChunk) {
			const item = parsed[key]
			if (!item || typeof item !== 'object') {
				values[key] = null
				continue
			}
			if (!('value' in item)) {
				values[key] = null
				continue
			}
			const itemValue = (item as { value?: unknown }).value
			values[key] = typeof itemValue === 'string' ? itemValue : null
		}
	}
	return values
}

async function uploadArtifactsBulk({
	kvBinding,
	wranglerConfigPath,
	wranglerEnv,
	entries,
	dryRun,
}: {
	kvBinding: string
	wranglerConfigPath: string
	wranglerEnv: string
	entries: Array<BulkPutEntry>
	dryRun: boolean
}) {
	if (dryRun || entries.length === 0) return
	for (const chunk of chunkArray(entries, kvBulkMutationChunkSize)) {
		await using temporaryJsonFile = await createTemporaryJsonFile({
			data: chunk,
			prefix: 'mdx-remote-bulk-put',
		})
		runWranglerCommand([
			'kv',
			'bulk',
			'put',
			temporaryJsonFile.path,
			'--binding',
			kvBinding,
			'--remote',
			'--config',
			wranglerConfigPath,
			'--env',
			wranglerEnv,
			'--preview',
			'false',
		])
	}
}

async function deleteArtifactsBulk({
	kvBinding,
	wranglerConfigPath,
	wranglerEnv,
	keys,
	dryRun,
}: {
	kvBinding: string
	wranglerConfigPath: string
	wranglerEnv: string
	keys: Array<string>
	dryRun: boolean
}) {
	if (dryRun || keys.length === 0) return
	for (const chunk of chunkArray(keys, kvBulkMutationChunkSize)) {
		await using temporaryJsonFile = await createTemporaryJsonFile({
			data: chunk,
			prefix: 'mdx-remote-bulk-delete',
		})
		runWranglerCommand([
			'kv',
			'bulk',
			'delete',
			temporaryJsonFile.path,
			'--binding',
			kvBinding,
			'--remote',
			'--config',
			wranglerConfigPath,
			'--env',
			wranglerEnv,
			'--preview',
			'false',
			'--force',
		])
	}
}

async function publishMdxRemoteArtifacts(options: CliOptions) {
	const { compiledEntries, manifestPath } = await compileMdxRemoteDocuments({
		contentDirectory: 'content',
		outputDirectory: options.outputDirectory,
		dryRun: options.dryRun,
		collections: ['blog', 'pages', 'writing-blog'],
		strictComponentValidation: true,
		strictExpressionValidation: true,
		continueOnError: false,
	})

	const changedSummary = getChangedMdxEntries({
		beforeSha: options.beforeSha,
		afterSha: options.afterSha,
	})
	const plan = buildPublishPlan({
		compiledEntries,
		changedSummary,
	})

	const bulkEntries = await Promise.all(
		[
			...plan.uploadEntries.map(async (entry) => ({
				key: toArtifactKey(entry),
				value: await readFile(path.resolve(entry.outputPath), 'utf8'),
			})),
			{
				key: 'manifest.json',
				value: await readFile(manifestPath, 'utf8'),
			},
		],
	)
	const existingValues = await getExistingBulkValues({
		kvBinding: options.kvBinding,
		wranglerConfigPath: options.wranglerConfigPath,
		wranglerEnv: options.wranglerEnv,
		keys: bulkEntries.map((entry) => entry.key),
		dryRun: options.dryRun,
	})
	const changedBulkEntries = filterChangedBulkEntries({
		bulkEntries,
		existingValues,
	})

	await uploadArtifactsBulk({
		kvBinding: options.kvBinding,
		wranglerConfigPath: options.wranglerConfigPath,
		wranglerEnv: options.wranglerEnv,
		entries: changedBulkEntries,
		dryRun: options.dryRun,
	})
	await deleteArtifactsBulk({
		kvBinding: options.kvBinding,
		wranglerConfigPath: options.wranglerConfigPath,
		wranglerEnv: options.wranglerEnv,
		keys: plan.deleteKeys,
		dryRun: options.dryRun,
	})

	console.log(
		`${options.dryRun ? '[dry-run] ' : ''}published mdx-remote artifacts`,
		{
			uploaded: changedBulkEntries.length,
			skippedUnchanged: bulkEntries.length - changedBulkEntries.length,
			deleted: plan.deleteKeys.length,
			kvBinding: options.kvBinding,
			wranglerConfigPath: options.wranglerConfigPath,
			wranglerEnv: options.wranglerEnv,
		},
	)
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	await publishMdxRemoteArtifacts(options)
}

if (process.argv[1]?.endsWith('publish-mdx-remote-artifacts.ts')) {
	main().catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
}

export {
	buildPublishPlan,
	filterChangedBulkEntries,
	getChangedMdxEntries,
	getMdxEntryPathKey,
	isRetryableWranglerFailure,
	parseArgs,
	parseNameStatusOutput,
	publishMdxRemoteArtifacts,
	toArtifactKey,
	toEntryKey,
}

export type { ChangedPathSummary, CliOptions, PublishPlan }
