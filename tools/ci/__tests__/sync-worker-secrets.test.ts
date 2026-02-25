import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { collectSecrets, parseArgs } from '../sync-worker-secrets.ts'

test('parseArgs supports repeated secret sources and flags', () => {
	const parsed = parseArgs([
		'--name',
		'kentcdodds-com',
		'--env',
		'preview',
		'--set',
		'STATIC_KEY=static-value',
		'--from-dotenv',
		'.env.example',
		'--set-from-env',
		'REQUIRED_SECRET',
		'--set-from-env-optional',
		'OPTIONAL_SECRET',
		'--set-from-env-optional',
		'SECOND_OPTIONAL_SECRET',
		'--include-empty',
		'--generate-cookie-secret',
	])

	expect(parsed).toEqual({
		name: 'kentcdodds-com',
		envName: 'preview',
		setValues: ['STATIC_KEY=static-value'],
		fromDotenv: ['.env.example'],
		setFromEnv: ['REQUIRED_SECRET'],
		setFromEnvOptional: ['OPTIONAL_SECRET', 'SECOND_OPTIONAL_SECRET'],
		includeEmpty: true,
		generateCookieSecret: true,
	})
})

test('parseArgs throws for malformed inputs', () => {
	expect(() => parseArgs(['--env', 'preview'])).toThrow(/--name/)
	expect(() => parseArgs(['--name'])).toThrow(/missing value/i)
	expect(() => parseArgs(['value-without-flag'])).toThrow(/unexpected argument/i)
})

test('collectSecrets merges dotenv, set, env, and generated values', async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sync-secrets-test-'))
	const dotenvPath = path.join(tempDir, '.test.env')
	await writeFile(
		dotenvPath,
		[
			'DOTENV_SECRET=dotenv-value',
			'EMPTY_DOTENV_SECRET=',
			'OVERRIDE_ME=dotenv-original',
		].join('\n'),
		'utf8',
	)

	const previousRequired = process.env.REQUIRED_SECRET
	const previousOptional = process.env.OPTIONAL_SECRET
	process.env.REQUIRED_SECRET = 'required-from-env'
	process.env.OPTIONAL_SECRET = 'optional-from-env'

	try {
		const secrets = await collectSecrets({
			name: 'kentcdodds-com',
			envName: null,
			setValues: ['INLINE_SECRET=inline-value', 'OVERRIDE_ME=inline-override'],
			fromDotenv: [dotenvPath],
			setFromEnv: ['REQUIRED_SECRET'],
			setFromEnvOptional: ['OPTIONAL_SECRET', 'MISSING_OPTIONAL_SECRET'],
			includeEmpty: false,
			generateCookieSecret: true,
		})

		expect(secrets.DOTENV_SECRET).toBe('dotenv-value')
		expect(secrets.EMPTY_DOTENV_SECRET).toBeUndefined()
		expect(secrets.INLINE_SECRET).toBe('inline-value')
		expect(secrets.OVERRIDE_ME).toBe('inline-override')
		expect(secrets.REQUIRED_SECRET).toBe('required-from-env')
		expect(secrets.OPTIONAL_SECRET).toBe('optional-from-env')
		expect(secrets.MISSING_OPTIONAL_SECRET).toBeUndefined()
		expect(secrets.SESSION_SECRET).toBeTypeOf('string')
		expect(secrets.SESSION_SECRET).toBeDefined()
		expect((secrets.SESSION_SECRET ?? '').length).toBeGreaterThan(10)
	} finally {
		await rm(tempDir, { recursive: true, force: true })
		if (previousRequired === undefined) delete process.env.REQUIRED_SECRET
		else process.env.REQUIRED_SECRET = previousRequired
		if (previousOptional === undefined) delete process.env.OPTIONAL_SECRET
		else process.env.OPTIONAL_SECRET = previousOptional
	}
})

test('collectSecrets throws when required env var is missing', async () => {
	const previousRequired = process.env.MISSING_REQUIRED_SECRET
	delete process.env.MISSING_REQUIRED_SECRET
	try {
		await expect(
			collectSecrets({
				name: 'kentcdodds-com',
				envName: null,
				setValues: [],
				fromDotenv: [],
				setFromEnv: ['MISSING_REQUIRED_SECRET'],
				setFromEnvOptional: [],
				includeEmpty: false,
				generateCookieSecret: false,
			}),
		).rejects.toThrow(/missing required environment variable/i)
	} finally {
		if (previousRequired === undefined) delete process.env.MISSING_REQUIRED_SECRET
		else process.env.MISSING_REQUIRED_SECRET = previousRequired
	}
})
