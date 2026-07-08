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
		DATABASE_URL: 'file:/tmp/process-env.sqlite',
		DATABASE_PATH: undefined,
		MOCKS: 'false',
	})

	const env = getEnv()

	expect(env.DATABASE_PATH).toBe('/tmp/process-env.sqlite')
	expect(env.MOCKS).toBe(false)
})

test('getEnv reads from the configured runtime env source', () => {
	using _env = setEnv({
		DATABASE_URL: 'file:/tmp/process-env.sqlite',
		DATABASE_PATH: undefined,
	})
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			DATABASE_URL: 'file:/tmp/runtime-env-source.sqlite',
			DATABASE_PATH: undefined,
			MOCKS: 'true',
			ALLOWED_ACTION_ORIGINS: 'https://a.example, https://b.example',
		}),
	)

	const env = getEnv()

	expect(env.DATABASE_PATH).toBe('/tmp/runtime-env-source.sqlite')
	expect(env.MOCKS).toBe(true)
	expect(env.allowedActionOrigins).toEqual([
		'https://a.example',
		'https://b.example',
	])
})

test('getEnv reads from the global runtime env source', () => {
	using _env = setEnv({
		DATABASE_URL: 'file:/tmp/process-env.sqlite',
		DATABASE_PATH: undefined,
	})
	const key = Symbol.for('kentcdodds.runtimeEnvSource')
	const globalStore = globalThis as typeof globalThis &
		Record<symbol, RuntimeEnvSource | undefined>
	globalStore[key] = createRuntimeEnvSource({
		DATABASE_URL: 'file:/tmp/global-runtime-env-source.sqlite',
		DATABASE_PATH: undefined,
		MOCKS: 'true',
	})

	try {
		const env = getEnv()

			expect(env.DATABASE_PATH).toBe('/tmp/global-runtime-env-source.sqlite')
		expect(env.MOCKS).toBe(true)
	} finally {
		delete globalStore[key]
	}
})

test('clearRuntimeEnvSource restores process.env reads', () => {
	using _env = setEnv({
		DATABASE_URL: 'file:/tmp/process-env.sqlite',
		DATABASE_PATH: undefined,
	})
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			DATABASE_URL: 'file:/tmp/runtime-env-source.sqlite',
			DATABASE_PATH: undefined,
		}),
	)
	expect(getEnv().DATABASE_PATH).toBe('/tmp/runtime-env-source.sqlite')

	clearRuntimeEnvSource()

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

test('getEnv accepts Worker-shaped config without file cache paths', () => {
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			DATABASE_URL: 'd1://app-db',
			DATABASE_PATH: undefined,
		}),
	)

	const env = getEnv()

	expect(env.DATABASE_PATH).toBe('')
})
