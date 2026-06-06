import { afterEach, expect, test } from 'vitest'
import {
	clearRuntimeEnvSource,
	setRuntimeEnvSource,
	type RuntimeEnvSource,
} from '../env.server.ts'
import {
	clearRuntimeBindingSource,
	getRuntimeBinding,
	setRuntimeBindingSource,
	type RuntimeBindingSource,
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

test('getRuntimeBinding reads from the global binding source', () => {
	const d1Binding = {
		prepare() {
			return null
		},
	}
	const key = Symbol.for('kentcdodds.runtimeBindingSource')
	const globalStore = globalThis as typeof globalThis &
		Record<symbol, RuntimeBindingSource | undefined>
	globalStore[key] = {
		DB: d1Binding,
		SEARCH_WORKER_TOKEN: 'global-binding-search-token',
	}

	try {
		expect(getRuntimeBinding('DB')).toBe(d1Binding)
		expect(getRuntimeBinding('SEARCH_WORKER_TOKEN')).toBe(
			'global-binding-search-token',
		)
	} finally {
		delete globalStore[key]
	}
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
