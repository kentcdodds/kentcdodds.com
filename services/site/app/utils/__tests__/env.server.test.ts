import { afterEach, expect, test } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'
import {
	clearRuntimeEnvSource,
	getEnv,
	setRuntimeEnvSource,
	type RuntimeEnvSource,
} from '../env.server.ts'

afterEach(() => {
	clearRuntimeEnvSource()
})

function createRuntimeEnvSource(
	overrides: RuntimeEnvSource = {},
): RuntimeEnvSource {
	return {
		...process.env,
		...overrides,
	}
}

test('getEnv reads from process.env by default', () => {
	using _env = setEnv({
		PORT: '3100',
		DATABASE_URL: 'file:/tmp/process-env.sqlite',
		DATABASE_PATH: undefined,
		MOCKS: 'false',
	})

	const env = getEnv()

	expect(env.PORT).toBe(3100)
	expect(env.DATABASE_PATH).toBe('/tmp/process-env.sqlite')
	expect(env.MOCKS).toBe(false)
})

test('getEnv reads from the configured runtime env source', () => {
	using _env = setEnv({
		PORT: '3100',
		DATABASE_URL: 'file:/tmp/process-env.sqlite',
		DATABASE_PATH: undefined,
	})
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			PORT: '4200',
			DATABASE_URL: 'file:/tmp/runtime-env-source.sqlite',
			DATABASE_PATH: undefined,
			MOCKS: 'true',
			ALLOWED_ACTION_ORIGINS: 'https://a.example, https://b.example',
		}),
	)

	const env = getEnv()

	expect(env.PORT).toBe(4200)
	expect(env.DATABASE_PATH).toBe('/tmp/runtime-env-source.sqlite')
	expect(env.MOCKS).toBe(true)
	expect(env.allowedActionOrigins).toEqual([
		'https://a.example',
		'https://b.example',
	])
})

test('clearRuntimeEnvSource restores process.env reads', () => {
	using _env = setEnv({
		PORT: '3100',
		DATABASE_URL: 'file:/tmp/process-env.sqlite',
		DATABASE_PATH: undefined,
	})
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			PORT: '4200',
			DATABASE_URL: 'file:/tmp/runtime-env-source.sqlite',
			DATABASE_PATH: undefined,
		}),
	)
	expect(getEnv().PORT).toBe(4200)

	clearRuntimeEnvSource()

	expect(getEnv().PORT).toBe(3100)
	expect(getEnv().DATABASE_PATH).toBe('/tmp/process-env.sqlite')
})

test('getEnv cache distinguishes unset values from empty strings', () => {
	using _env = setEnv({
		SENTRY_DSN: undefined,
	})
	expect(getEnv().SENTRY_DSN).toBeUndefined()

	using _updatedEnv = setEnv({
		SENTRY_DSN: '',
	})

	expect(getEnv().SENTRY_DSN).toBe('')
})
