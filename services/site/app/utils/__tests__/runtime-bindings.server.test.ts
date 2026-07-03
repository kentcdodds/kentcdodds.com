import { afterEach, expect, test } from 'vitest'
import {
	clearRuntimeEnvSource,
	setRuntimeEnvSource,
	type RuntimeEnvSource,
} from '../env.server.ts'
import {
	clearRuntimeBindingSource,
	getRuntimeBinding,
	hasAppDbBinding,
	setRuntimeBindingSource,
} from '../runtime-bindings.server.ts'

afterEach(() => {
	clearRuntimeBindingSource()
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

test('getRuntimeBinding reads from getEnv when no binding source is configured', () => {
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			DATABASE_URL: 'file:/tmp/runtime-binding.sqlite',
			DATABASE_PATH: undefined,
			PORT: '4500',
			SEARCH_WORKER_TOKEN: 'env-search-token',
		}),
	)

	expect(getRuntimeBinding('DATABASE_PATH')).toBe('/tmp/runtime-binding.sqlite')
	expect(getRuntimeBinding('SEARCH_WORKER_TOKEN')).toBe('env-search-token')
	expect(getRuntimeBinding('PORT')).toBe(4500)
})

test('getRuntimeBinding prefers the configured binding source', () => {
	const d1Binding = {
		prepare() {
			return null
		},
	}
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			SEARCH_WORKER_TOKEN: 'env-search-token',
		}),
	)
	setRuntimeBindingSource({
		DB: d1Binding,
		SEARCH_WORKER_TOKEN: 'binding-search-token',
	})

	expect(getRuntimeBinding('DB')).toBe(d1Binding)
	expect(getRuntimeBinding('SEARCH_WORKER_TOKEN')).toBe('binding-search-token')
})

test('hasAppDbBinding recognizes D1-shaped APP_DB bindings', () => {
	setRuntimeBindingSource({
		APP_DB: {
			prepare() {},
			batch() {},
			exec() {},
			dump() {},
			withSession() {},
		},
	})

	expect(hasAppDbBinding()).toBe(true)
})

test('getRuntimeBinding falls back to getEnv after clearing the binding source', () => {
	setRuntimeEnvSource(
		createRuntimeEnvSource({
			SEARCH_WORKER_TOKEN: 'env-search-token',
		}),
	)
	setRuntimeBindingSource({
		SEARCH_WORKER_TOKEN: 'binding-search-token',
	})
	expect(getRuntimeBinding('SEARCH_WORKER_TOKEN')).toBe('binding-search-token')

	clearRuntimeBindingSource()

	expect(getRuntimeBinding('SEARCH_WORKER_TOKEN')).toBe('env-search-token')
})
