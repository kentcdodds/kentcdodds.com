import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'dotenv'

export type ParsedArgs = {
	name: string
	envName: string | null
	setValues: Array<string>
	fromDotenv: Array<string>
	setFromEnv: Array<string>
	setFromEnvOptional: Array<string>
	generateSecrets: Array<string>
	includeEmpty: boolean
	generateCookieSecret: boolean
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	const secrets = await collectSecrets(args)
	if (Object.keys(secrets).length === 0) {
		console.log('No secrets to sync. Skipping.')
		return
	}

	const tempFile = path.join(
		os.tmpdir(),
		`worker-secrets-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
	)
	await writeFile(tempFile, JSON.stringify(secrets, null, 2), 'utf-8')
	try {
		await runWranglerSecretBulk({
			secretFile: tempFile,
			name: args.name,
			envName: args.envName,
		})
	} finally {
		await rm(tempFile, { force: true })
	}
}

export async function collectSecrets(args: ParsedArgs) {
	const secrets: Record<string, string> = {}

	for (const dotenvPath of args.fromDotenv) {
		const absolutePath = path.resolve(process.cwd(), dotenvPath)
		const fileContents = await readFile(absolutePath, 'utf-8')
		const parsed = parse(fileContents)
		for (const [key, value] of Object.entries(parsed)) {
			assignSecret(secrets, key, value, args.includeEmpty)
		}
	}

	for (const entry of args.setValues) {
		const equalsIndex = entry.indexOf('=')
		if (equalsIndex <= 0) {
			throw new Error(`Invalid --set value "${entry}". Expected KEY=VALUE.`)
		}
		const key = entry.slice(0, equalsIndex)
		const value = entry.slice(equalsIndex + 1)
		assignSecret(secrets, key, value, args.includeEmpty)
	}

	for (const key of args.setFromEnv) {
		const value = process.env[key]
		if (value === undefined) {
			throw new Error(`Missing required environment variable "${key}"`)
		}
		assignSecret(secrets, key, value, args.includeEmpty)
	}

	for (const key of args.setFromEnvOptional) {
		const value = process.env[key]
		if (value === undefined) continue
		assignSecret(secrets, key, value, args.includeEmpty)
	}

	if (args.generateCookieSecret) {
		assignSecret(
			secrets,
			'SESSION_SECRET',
			randomBytes(32).toString('base64url'),
			true,
		)
	}

	for (const key of args.generateSecrets) {
		assignSecret(secrets, key, randomBytes(32).toString('base64url'), true)
	}

	return secrets
}

function assignSecret(
	target: Record<string, string>,
	key: string,
	value: string,
	includeEmpty: boolean,
) {
	if (!includeEmpty && value.length === 0) return
	target[key] = value
}

async function runWranglerSecretBulk({
	secretFile,
	name,
	envName,
}: {
	secretFile: string
	name: string
	envName: string | null
}) {
	const commandArgs = [
		'./wrangler-env.ts',
		'secret',
		'bulk',
		secretFile,
		'--name',
		name,
		...(envName ? ['--env', envName] : []),
	]

	await new Promise<void>((resolve, reject) => {
		const child = spawn('bun', commandArgs, {
			stdio: 'inherit',
			env: process.env,
		})
		child.once('exit', (code) => {
			if (code === 0) {
				resolve()
				return
			}
			reject(new Error(`wrangler secret bulk exited with code ${code ?? 1}`))
		})
		child.once('error', reject)
	})
}

export function parseArgs(rawArgs: Array<string>): ParsedArgs {
	const options = new Map<string, Array<string>>()
	const flags = new Set<string>()
	const flagKeys = new Set(['include-empty', 'generate-cookie-secret'])
	const optionKeys = new Set([
		'name',
		'env',
		'set',
		'from-dotenv',
		'set-from-env',
		'set-from-env-optional',
		'generate-secret',
	])

	for (let index = 0; index < rawArgs.length; index++) {
		const arg = rawArgs[index]
		if (!arg?.startsWith('--')) {
			throw new Error(`Unexpected argument "${arg}"`)
		}
		const key = arg.slice(2)
		if (flagKeys.has(key)) {
			flags.add(key)
			continue
		}
		if (!optionKeys.has(key)) {
			throw new Error(`Unknown option --${key}`)
		}
		const value = rawArgs[index + 1]
		if (!value || value.startsWith('--')) {
			throw new Error(`Missing value for --${key}`)
		}
		index++
		const list = options.get(key) ?? []
		list.push(value)
		options.set(key, list)
	}

	const name = options.get('name')?.at(-1)
	if (!name) {
		throw new Error(`Missing required option --name`)
	}

	return {
		name,
		envName: options.get('env')?.at(-1) ?? null,
		setValues: options.get('set') ?? [],
		fromDotenv: options.get('from-dotenv') ?? [],
		setFromEnv: options.get('set-from-env') ?? [],
		setFromEnvOptional: options.get('set-from-env-optional') ?? [],
		generateSecrets: options.get('generate-secret') ?? [],
		includeEmpty: flags.has('include-empty'),
		generateCookieSecret: flags.has('generate-cookie-secret'),
	}
}

const isExecutedDirectly =
	process.argv[1] &&
	path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isExecutedDirectly) {
	main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
