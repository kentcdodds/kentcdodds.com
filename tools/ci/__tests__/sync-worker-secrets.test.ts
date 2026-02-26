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
		'--generate-secret',
		'MAGIC_LINK_SECRET',
		'--generate-secret',
		'CF_INTERNAL_SECRET',
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
		generateSecrets: ['MAGIC_LINK_SECRET', 'CF_INTERNAL_SECRET'],
		includeEmpty: true,
		generateCookieSecret: true,
	})
})

test('parseArgs throws for malformed inputs', () => {
	expect(() => parseArgs(['--env', 'preview'])).toThrow(/--name/)
	expect(() => parseArgs(['--name'])).toThrow(/missing value/i)
	expect(() => parseArgs(['value-without-flag'])).toThrow(/unexpected argument/i)
	expect(() => parseArgs(['--name', 'worker', '--unknown-flag', 'value'])).toThrow(
		/unexpected argument|missing value|unknown/i,
	)
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
			generateSecrets: ['MAGIC_LINK_SECRET', 'REFRESH_CACHE_SECRET'],
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
		expect(secrets.MAGIC_LINK_SECRET).toBeTypeOf('string')
		expect((secrets.MAGIC_LINK_SECRET ?? '').length).toBeGreaterThan(10)
		expect(secrets.REFRESH_CACHE_SECRET).toBeTypeOf('string')
		expect((secrets.REFRESH_CACHE_SECRET ?? '').length).toBeGreaterThan(10)
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
				generateSecrets: [],
				includeEmpty: false,
				generateCookieSecret: false,
			}),
		).rejects.toThrow(/missing required environment variable/i)
	} finally {
		if (previousRequired === undefined) delete process.env.MISSING_REQUIRED_SECRET
		else process.env.MISSING_REQUIRED_SECRET = previousRequired
	}
})

test('collectSecrets includes empty values when includeEmpty is true', async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sync-secrets-empty-test-'))
	const dotenvPath = path.join(tempDir, '.test-empty.env')
	await writeFile(
		dotenvPath,
		['EMPTY_FROM_DOTENV=', 'NON_EMPTY_FROM_DOTENV=available'].join('\n'),
		'utf8',
	)

	try {
		const secrets = await collectSecrets({
			name: 'kentcdodds-com',
			envName: 'preview',
			setValues: ['EMPTY_FROM_SET=', 'NON_EMPTY_FROM_SET=value'],
			fromDotenv: [dotenvPath],
			setFromEnv: [],
			setFromEnvOptional: [],
			generateSecrets: [],
			includeEmpty: true,
			generateCookieSecret: false,
		})

		expect(secrets.EMPTY_FROM_DOTENV).toBe('')
		expect(secrets.EMPTY_FROM_SET).toBe('')
		expect(secrets.NON_EMPTY_FROM_DOTENV).toBe('available')
		expect(secrets.NON_EMPTY_FROM_SET).toBe('value')
	} finally {
		await rm(tempDir, { recursive: true, force: true })
	}
})
