import { spawnSync } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Command = 'ensure' | 'cleanup'

type CliOptions = {
	workerName: string
	wranglerConfigPath: string
	outConfigPath: string
	environment: string
	dryRun: boolean
	mdxRemoteR2BucketName: string | null
}

type D1DatabaseListEntry = {
	uuid: string
	name: string
}

type KvNamespaceListEntry = {
	id: string
	title: string
}

function fail(message: string): never {
	console.error(message)
	process.exit(1)
}

function parseArgs(argv: Array<string>) {
	const command = argv[0]
	if (command !== 'ensure' && command !== 'cleanup') {
		fail(
			`Missing or invalid command. Usage: bun tools/ci/preview-resources.ts <ensure|cleanup> --worker-name <name>`,
		)
	}

	const options: CliOptions = {
		workerName: '',
		wranglerConfigPath: 'wrangler.jsonc',
		outConfigPath: 'wrangler-preview.generated.jsonc',
		environment: 'preview',
		dryRun: false,
		mdxRemoteR2BucketName: null,
	}

	for (let index = 1; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
			case '--worker-name':
				options.workerName = argv[index + 1] ?? ''
				index += 1
				break
			case '--wrangler-config':
				options.wranglerConfigPath = argv[index + 1] ?? ''
				index += 1
				break
			case '--out-config':
				options.outConfigPath = argv[index + 1] ?? ''
				index += 1
				break
			case '--environment':
				options.environment = argv[index + 1] ?? ''
				index += 1
				break
			case '--dry-run':
				options.dryRun = true
				break
			case '--mdx-remote-r2-bucket':
				options.mdxRemoteR2BucketName = argv[index + 1] ?? null
				index += 1
				break
			default:
				if (arg.startsWith('-')) {
					fail(`Unknown flag: ${arg}`)
				}
		}
	}

	if (!options.workerName) {
		fail('Missing required flag: --worker-name <name>')
	}
	if (!options.environment) {
		fail('Missing required flag: --environment <name>')
	}

	return {
		command: command as Command,
		options,
	}
}

function runWrangler(
	args: Array<string>,
	options?: { input?: string; quiet?: boolean },
) {
	const bunBin = process.execPath
	const result = spawnSync(bunBin, ['x', 'wrangler', ...args], {
		encoding: 'utf8',
		stdio: 'pipe',
		input: options?.input,
		env: process.env,
	})

	const status = result.status ?? 1
	const stdout = result.stdout ?? ''
	const stderr = result.stderr ?? ''

	if (!options?.quiet) {
		console.error(`wrangler: bun x wrangler ${args.join(' ')}`)
	}

	if (status !== 0) {
		const output = `${stdout}${stderr}`.trim()
		if (output) console.error(output)
	}

	return { status, stdout, stderr }
}

function runWranglerWithRetry(
	args: Array<string>,
	options?: {
		input?: string
		quiet?: boolean
		maxAttempts?: number
	},
) {
	const maxAttempts = Math.max(1, options?.maxAttempts ?? 4)
	let lastResult: ReturnType<typeof runWrangler> | null = null
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const result = runWrangler(args, options)
		lastResult = result
		if (result.status === 0) return result

		if (attempt >= maxAttempts) break

		const output = `${result.stdout}${result.stderr}`
		if (!isRetryableWranglerFailure(output)) break
		console.error(
			`wrangler command failed (attempt ${attempt}/${maxAttempts}), retrying...`,
		)
	}
	return (
		lastResult ?? {
			status: 1,
			stdout: '',
			stderr: '',
		}
	)
}

function isRetryableWranglerFailure(output: string) {
	const lower = output.toLowerCase()
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
		lower.includes('5xx')
	)
}

function buildPreviewResourceNames(workerName: string) {
	const maxLen = 63
	const d1Suffix = '-db'
	const kvSuffix = '-site-cache-kv'
	const queueSuffix = '-calls-draft-queue'
	const d1DatabaseName = truncateWithSuffix(workerName, d1Suffix, maxLen)
	const siteCacheKvTitle = truncateWithSuffix(workerName, kvSuffix, maxLen)
	const callsDraftQueueName = truncateWithSuffix(
		workerName,
		queueSuffix,
		maxLen,
	)
	return { d1DatabaseName, siteCacheKvTitle, callsDraftQueueName }
}

function truncateWithSuffix(base: string, suffix: string, maxLen: number) {
	if (base.length + suffix.length <= maxLen) return `${base}${suffix}`
	const cut = Math.max(1, maxLen - suffix.length)
	const trimmed = base.slice(0, cut).replace(/-+$/g, '')
	return `${trimmed}${suffix}`
}

function listD1Databases() {
	const result = runWranglerWithRetry(['d1', 'list', '--json'], {
		quiet: true,
	})
	if (result.status !== 0) {
		fail('Failed to list D1 databases (wrangler d1 list --json).')
	}
	try {
		return JSON.parse(result.stdout) as Array<D1DatabaseListEntry>
	} catch {
		fail('Could not parse JSON output from wrangler d1 list --json.')
	}
}

function ensureD1Database({
	name,
	dryRun,
}: {
	name: string
	dryRun: boolean
}) {
	if (dryRun) {
		console.error(`[dry-run] ensure D1 database: ${name}`)
		return { name, id: `dry-run-${name}` }
	}

	const existing = listD1Databases().find((db) => db.name === name)
	if (existing) {
		console.error(`D1 database exists: ${name} (${existing.uuid})`)
		return { name, id: existing.uuid }
	}

	const createResult = runWranglerWithRetry(['d1', 'create', name], {
		input: 'n\n',
		quiet: true,
	})
	if (createResult.status !== 0) {
		fail(`Failed to create D1 database: ${name}`)
	}
	const created = listD1Databases().find((db) => db.name === name)
	if (!created) {
		fail(`Created D1 database "${name}" but could not find it via list.`)
	}
	console.error(`Created D1 database: ${name} (${created.uuid})`)
	return { name, id: created.uuid }
}

function deleteD1Database({ name, dryRun }: { name: string; dryRun: boolean }) {
	if (dryRun) {
		console.error(`[dry-run] delete D1 database: ${name}`)
		return
	}
	const existing = listD1Databases().some((db) => db.name === name)
	if (!existing) {
		console.error(`D1 database already deleted: ${name}`)
		return
	}
	const result = runWranglerWithRetry(
		['d1', 'delete', name, '--skip-confirmation'],
		{
			quiet: true,
		},
	)
	if (result.status !== 0) {
		fail(`Failed to delete D1 database: ${name}`)
	}
	console.error(`Deleted D1 database: ${name}`)
}

function listKvNamespaces() {
	const result = runWranglerWithRetry(['kv', 'namespace', 'list'], {
		quiet: true,
	})
	if (result.status !== 0) {
		fail('Failed to list KV namespaces.')
	}
	try {
		return JSON.parse(result.stdout) as Array<KvNamespaceListEntry>
	} catch {
		fail('Could not parse JSON output from wrangler kv namespace list.')
	}
}

function ensureKvNamespace({
	title,
	dryRun,
}: {
	title: string
	dryRun: boolean
}) {
	if (dryRun) {
		console.error(`[dry-run] ensure KV namespace: ${title}`)
		return { title, id: `dry-run-${title}` }
	}
	const existing = listKvNamespaces().find((entry) => entry.title === title)
	if (existing) {
		console.error(`KV namespace exists: ${title} (${existing.id})`)
		return { title, id: existing.id }
	}
	const createResult = runWranglerWithRetry(
		['kv', 'namespace', 'create', title],
		{
			input: 'n\n',
			quiet: true,
		},
	)
	if (createResult.status !== 0) {
		fail(`Failed to create KV namespace: ${title}`)
	}
	const created = listKvNamespaces().find((entry) => entry.title === title)
	if (!created) {
		fail(`Created KV namespace "${title}" but could not find it via list.`)
	}
	console.error(`Created KV namespace: ${title} (${created.id})`)
	return { title, id: created.id }
}

function deleteKvNamespace({
	title,
	dryRun,
}: {
	title: string
	dryRun: boolean
}) {
	if (dryRun) {
		console.error(`[dry-run] delete KV namespace: ${title}`)
		return
	}
	const existing = listKvNamespaces().find((entry) => entry.title === title)
	if (!existing) {
		console.error(`KV namespace already deleted: ${title}`)
		return
	}
	const result = runWranglerWithRetry(
		[
			'kv',
			'namespace',
			'delete',
			'--namespace-id',
			existing.id,
			'--skip-confirmation',
		],
		{ quiet: true },
	)
	if (result.status !== 0) {
		fail(`Failed to delete KV namespace: ${title}`)
	}
	console.error(`Deleted KV namespace: ${title} (${existing.id})`)
}

function isQueueMissingError(output: string) {
	const lower = output.toLowerCase()
	return (
		lower.includes('not found') ||
		lower.includes('does not exist') ||
		lower.includes('unknown queue')
	)
}

function ensureQueue({ name, dryRun }: { name: string; dryRun: boolean }) {
	if (dryRun) {
		console.error(`[dry-run] ensure queue: ${name}`)
		return { name }
	}

	const infoResult = runWranglerWithRetry(['queues', 'info', name], {
		quiet: true,
		maxAttempts: 1,
	})
	if (infoResult.status === 0) {
		console.error(`Queue exists: ${name}`)
		return { name }
	}
	const infoOutput = `${infoResult.stdout}${infoResult.stderr}`.trim()
	if (infoOutput && !isQueueMissingError(infoOutput)) {
		fail(`Failed to inspect queue "${name}": ${infoOutput}`)
	}

	const createResult = runWranglerWithRetry(['queues', 'create', name], {
		quiet: true,
		input: 'y\n',
	})
	if (createResult.status !== 0) {
		const output = `${createResult.stdout}${createResult.stderr}`.trim()
		if (!output.toLowerCase().includes('already exists')) {
			fail(`Failed to create queue "${name}": ${output}`)
		}
	}
	console.error(`Created queue: ${name}`)
	return { name }
}

function deleteQueue({ name, dryRun }: { name: string; dryRun: boolean }) {
	if (dryRun) {
		console.error(`[dry-run] delete queue: ${name}`)
		return
	}

	const infoResult = runWranglerWithRetry(['queues', 'info', name], {
		quiet: true,
		maxAttempts: 1,
	})
	if (infoResult.status !== 0) {
		const output = `${infoResult.stdout}${infoResult.stderr}`.trim()
		if (!output || isQueueMissingError(output)) {
			console.error(`Queue already deleted: ${name}`)
			return
		}
		fail(`Failed to inspect queue "${name}": ${output}`)
	}

	const deleteResult = runWranglerWithRetry(['queues', 'delete', name], {
		quiet: true,
		input: 'y\n',
	})
	if (deleteResult.status !== 0) {
		fail(`Failed to delete queue: ${name}`)
	}
	console.error(`Deleted queue: ${name}`)
}

async function writeGeneratedWranglerConfig({
	baseConfigPath,
	outConfigPath,
	environment,
	workerName,
	d1DatabaseName,
	d1DatabaseId,
	siteCacheKvId,
	callsDraftQueueName,
	mdxRemoteR2BucketName,
}: {
	baseConfigPath: string
	outConfigPath: string
	environment: string
	workerName: string
	d1DatabaseName: string
	d1DatabaseId: string
	siteCacheKvId: string
	callsDraftQueueName: string
	mdxRemoteR2BucketName: string | null
}) {
	const baseText = await readFile(baseConfigPath, 'utf8')
	const config = JSON.parse(baseText) as Record<string, unknown>

	const env = config.env
	if (!env || typeof env !== 'object') {
		fail(`wrangler config "${baseConfigPath}" is missing "env".`)
	}

	const environmentConfig = (env as Record<string, unknown>)[environment]
	if (!environmentConfig || typeof environmentConfig !== 'object') {
		fail(`wrangler config "${baseConfigPath}" is missing "env.${environment}".`)
	}

	const targetConfig = environmentConfig as Record<string, unknown>
	targetConfig.name = workerName
	targetConfig.vars = {
		...(isRecord(targetConfig.vars) ? targetConfig.vars : {}),
		APP_ENV: environment,
	}

	const existingD1Databases = Array.isArray(targetConfig.d1_databases)
		? targetConfig.d1_databases
		: []
	const d1WithoutBinding = existingD1Databases.filter((entry) => {
		return !(isRecord(entry) && entry.binding === 'APP_DB')
	})
	targetConfig.d1_databases = [
		...d1WithoutBinding,
		{
			binding: 'APP_DB',
			database_name: d1DatabaseName,
			database_id: d1DatabaseId,
			migrations_dir: 'prisma/migrations',
		},
	]

	const existingKvNamespaces = Array.isArray(targetConfig.kv_namespaces)
		? targetConfig.kv_namespaces
		: []
	const kvWithoutBinding = existingKvNamespaces.filter((entry) => {
		return !(isRecord(entry) && entry.binding === 'SITE_CACHE_KV')
	})
	targetConfig.kv_namespaces = [
		...kvWithoutBinding,
		{
			binding: 'SITE_CACHE_KV',
			id: siteCacheKvId,
			preview_id: siteCacheKvId,
		},
	]

	const existingR2Buckets = Array.isArray(targetConfig.r2_buckets)
		? targetConfig.r2_buckets
		: []
	const r2WithoutMdxBinding = existingR2Buckets.filter((entry) => {
		return !(isRecord(entry) && entry.binding === 'MDX_REMOTE_R2')
	})
	if (mdxRemoteR2BucketName) {
		targetConfig.r2_buckets = [
			...r2WithoutMdxBinding,
			{
				binding: 'MDX_REMOTE_R2',
				bucket_name: mdxRemoteR2BucketName,
			},
		]
	} else {
		targetConfig.r2_buckets = r2WithoutMdxBinding
	}

	const existingQueues = isRecord(targetConfig.queues)
		? (targetConfig.queues as Record<string, unknown>)
		: {}
	const existingQueueProducers = Array.isArray(existingQueues.producers)
		? existingQueues.producers
		: []
	const queueProducersWithoutBinding = existingQueueProducers.filter((entry) => {
		return !(isRecord(entry) && entry.binding === 'CALLS_DRAFT_QUEUE')
	})
	const existingQueueConsumers = Array.isArray(existingQueues.consumers)
		? existingQueues.consumers
		: []
	const queueConsumersWithoutQueue = existingQueueConsumers.filter((entry) => {
		return !(isRecord(entry) && entry.queue === callsDraftQueueName)
	})
	targetConfig.queues = {
		...existingQueues,
		producers: [
			...queueProducersWithoutBinding,
			{
				binding: 'CALLS_DRAFT_QUEUE',
				queue: callsDraftQueueName,
			},
		],
		consumers: [
			...queueConsumersWithoutQueue,
			{
				queue: callsDraftQueueName,
				max_batch_size: 1,
				max_batch_timeout: 5,
			},
		],
	}

	const resolvedOut = path.resolve(outConfigPath)
	await mkdir(path.dirname(resolvedOut), { recursive: true })
	await writeFile(resolvedOut, `${JSON.stringify(config, null, '\t')}\n`, 'utf8')
	console.error(`Wrote generated Wrangler config: ${resolvedOut}`)
	return resolvedOut
}

async function ensurePreviewResources(options: CliOptions) {
	const { d1DatabaseName, siteCacheKvTitle, callsDraftQueueName } =
		buildPreviewResourceNames(options.workerName)

	const queue = ensureQueue({
		name: callsDraftQueueName,
		dryRun: options.dryRun,
	})
	const d1 = ensureD1Database({ name: d1DatabaseName, dryRun: options.dryRun })
	const kv = ensureKvNamespace({ title: siteCacheKvTitle, dryRun: options.dryRun })

	const generatedConfigPath = await writeGeneratedWranglerConfig({
		baseConfigPath: options.wranglerConfigPath,
		outConfigPath: options.outConfigPath,
		environment: options.environment,
		workerName: options.workerName,
		d1DatabaseName: d1.name,
		d1DatabaseId: d1.id,
		siteCacheKvId: kv.id,
		callsDraftQueueName: queue.name,
		mdxRemoteR2BucketName: options.mdxRemoteR2BucketName,
	})

	console.log(`wrangler_config=${generatedConfigPath}`)
	console.log(`d1_database_name=${d1.name}`)
	console.log(`d1_database_id=${d1.id}`)
	console.log(`site_cache_kv_title=${kv.title}`)
	console.log(`site_cache_kv_id=${kv.id}`)
	console.log(`calls_draft_queue_name=${queue.name}`)
	console.log(`mdx_remote_r2_bucket=${options.mdxRemoteR2BucketName ?? ''}`)
}

async function cleanupPreviewResources(options: CliOptions) {
	const { d1DatabaseName, siteCacheKvTitle, callsDraftQueueName } =
		buildPreviewResourceNames(options.workerName)

	deleteQueue({ name: callsDraftQueueName, dryRun: options.dryRun })
	deleteKvNamespace({ title: siteCacheKvTitle, dryRun: options.dryRun })
	deleteD1Database({ name: d1DatabaseName, dryRun: options.dryRun })
	const outputConfigPath = path.resolve(options.outConfigPath)
	await rm(outputConfigPath, { force: true })
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

async function main() {
	const { command, options } = parseArgs(process.argv.slice(2))
	if (!process.env.CLOUDFLARE_API_TOKEN && !options.dryRun) {
		fail(
			'Missing CLOUDFLARE_API_TOKEN (required for Wrangler resource operations).',
		)
	}
	if (command === 'ensure') {
		await ensurePreviewResources(options)
		return
	}
	await cleanupPreviewResources(options)
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
