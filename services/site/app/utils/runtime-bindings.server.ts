import { getEnv } from './env.server.ts'

export type RuntimeBindingSource = Record<string, unknown>
const runtimeBindingSourceKey = Symbol.for('kentcdodds.runtimeBindingSource')

let runtimeBindingSource: RuntimeBindingSource | undefined

function hasOwn(source: RuntimeBindingSource, name: string) {
	return Object.prototype.hasOwnProperty.call(source, name)
}

export function setRuntimeBindingSource(source: RuntimeBindingSource) {
	runtimeBindingSource = source
	getGlobalRuntimeBindingStore()[runtimeBindingSourceKey] = source
}

export function clearRuntimeBindingSource() {
	runtimeBindingSource = undefined
	delete getGlobalRuntimeBindingStore()[runtimeBindingSourceKey]
}

export function getRuntimeBinding<T = unknown>(name: string): T | undefined {
	const source =
		runtimeBindingSource ??
		getGlobalRuntimeBindingStore()[runtimeBindingSourceKey]
	if (source && hasOwn(source, name)) {
		return source[name] as T | undefined
	}

	const env = getEnv() as RuntimeBindingSource
	return env[name] as T | undefined
}

function getGlobalRuntimeBindingStore() {
	return globalThis as typeof globalThis &
		Record<symbol, RuntimeBindingSource | undefined>
}
