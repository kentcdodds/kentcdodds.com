import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Command = 'ensure' | 'cleanup'

type Args = {
	command: Command
	workerName: string
	outConfig: string
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	if (args.command === 'ensure') {
		await ensurePreviewResources(args)
		return
	}
	await cleanupPreviewResources(args)
}

async function ensurePreviewResources({
	workerName,
	outConfig,
}: Args) {
	const rootConfigPath = path.join(process.cwd(), 'wrangler.jsonc')
	const outputConfigPath = path.resolve(process.cwd(), outConfig)
	const rootConfigContents = await readFile(rootConfigPath, 'utf-8')
	const rootConfig = JSON.parse(rootConfigContents) as Record<string, unknown>

	const generatedConfig = structuredClone(rootConfig)
	generatedConfig.name = workerName
	generatedConfig.vars = {
		...(isRecord(generatedConfig.vars) ? generatedConfig.vars : {}),
		APP_ENV: 'preview',
	}

	if (!isRecord(generatedConfig.env)) generatedConfig.env = {}
	const envConfig = generatedConfig.env as Record<string, unknown>
	const previewConfig = isRecord(envConfig.preview)
		? envConfig.preview
		: {}

	envConfig.preview = {
		...previewConfig,
		name: workerName,
		vars: {
			...(isRecord(previewConfig.vars) ? previewConfig.vars : {}),
			APP_ENV: 'preview',
		},
	}

	await mkdir(path.dirname(outputConfigPath), { recursive: true })
	await writeFile(
		outputConfigPath,
		`${JSON.stringify(generatedConfig, null, '\t')}\n`,
		'utf-8',
	)

	emitOutput('wrangler_config', outputConfigPath)
	emitOutput('d1_database_name', `${workerName}-db`)
	emitOutput('oauth_kv_title', `${workerName}-oauth`)
}

async function cleanupPreviewResources({ outConfig }: Args) {
	const outputConfigPath = path.resolve(process.cwd(), outConfig)
	await rm(outputConfigPath, { force: true })
}

function parseArgs(rawArgs: Array<string>): Args {
	const [commandRaw, ...rest] = rawArgs
	if (commandRaw !== 'ensure' && commandRaw !== 'cleanup') {
		throw new Error(`Expected command "ensure" or "cleanup", got "${commandRaw}"`)
	}

	const options = new Map<string, Array<string>>()
	for (let index = 0; index < rest.length; index++) {
		const arg = rest[index]
		if (!arg?.startsWith('--')) {
			throw new Error(`Unexpected argument "${arg}"`)
		}
		const key = arg.slice(2)
		const value = rest[index + 1]
		if (!value || value.startsWith('--')) {
			throw new Error(`Missing value for --${key}`)
		}
		index++
		const current = options.get(key) ?? []
		current.push(value)
		options.set(key, current)
	}

	const workerName = options.get('worker-name')?.at(-1)
	if (!workerName) {
		throw new Error(`Missing required option --worker-name`)
	}

	return {
		command: commandRaw,
		workerName,
		outConfig: options.get('out-config')?.at(-1) ?? 'wrangler-preview.generated.jsonc',
	}
}

function emitOutput(key: string, value: string) {
	console.log(`${key}=${value}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
