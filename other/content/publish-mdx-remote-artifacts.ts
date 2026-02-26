import { execFileSync, execSync } from 'node:child_process'
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

function runWranglerCommand(args: Array<string>) {
	const { command, args: commandArgs } = getWranglerCommandPrefix()
	const maxAttempts = 4
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			execFileSync(command, [...commandArgs, ...args], {
				env: process.env,
				stdio: 'inherit',
			})
			return
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
}

function uploadArtifact({
	kvBinding,
	wranglerConfigPath,
	wranglerEnv,
	key,
	filePath,
	dryRun,
}: {
	kvBinding: string
	wranglerConfigPath: string
	wranglerEnv: string
	key: string
	filePath: string
	dryRun: boolean
}) {
	if (dryRun) return
	runWranglerCommand([
		'kv',
		'key',
		'put',
		key,
		'--binding',
		kvBinding,
		'--remote',
		'--config',
		wranglerConfigPath,
		'--env',
		wranglerEnv,
		'--preview',
		'false',
		'--path',
		filePath,
	])
}

function deleteArtifact({
	kvBinding,
	wranglerConfigPath,
	wranglerEnv,
	key,
	dryRun,
}: {
	kvBinding: string
	wranglerConfigPath: string
	wranglerEnv: string
	key: string
	dryRun: boolean
}) {
	if (dryRun) return
	runWranglerCommand([
		'kv',
		'key',
		'delete',
		key,
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

	for (const entry of plan.uploadEntries) {
		uploadArtifact({
			kvBinding: options.kvBinding,
			wranglerConfigPath: options.wranglerConfigPath,
			wranglerEnv: options.wranglerEnv,
			key: toArtifactKey(entry),
			filePath: path.resolve(entry.outputPath),
			dryRun: options.dryRun,
		})
	}

	for (const deleteKey of plan.deleteKeys) {
		deleteArtifact({
			kvBinding: options.kvBinding,
			wranglerConfigPath: options.wranglerConfigPath,
			wranglerEnv: options.wranglerEnv,
			key: deleteKey,
			dryRun: options.dryRun,
		})
	}

	uploadArtifact({
		kvBinding: options.kvBinding,
		wranglerConfigPath: options.wranglerConfigPath,
		wranglerEnv: options.wranglerEnv,
		key: 'manifest.json',
		filePath: manifestPath,
		dryRun: options.dryRun,
	})

	console.log(
		`${options.dryRun ? '[dry-run] ' : ''}published mdx-remote artifacts`,
		{
			uploaded: plan.uploadEntries.length,
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
