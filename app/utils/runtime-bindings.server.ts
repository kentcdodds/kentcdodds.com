let runtimeBindingSource: Record<string, unknown> | null = null
const runtimeBindingSourceSymbol = Symbol.for(
	'kentcdodds.runtime-binding-source',
)

type RuntimeBindingStore = typeof globalThis & {
	[runtimeBindingSourceSymbol]?: Record<string, unknown> | null
}

export function setRuntimeBindingSource(source: Record<string, unknown>) {
	runtimeBindingSource = source
	;(globalThis as RuntimeBindingStore)[runtimeBindingSourceSymbol] = source
}

export function clearRuntimeBindingSource() {
	runtimeBindingSource = null
	delete (globalThis as RuntimeBindingStore)[runtimeBindingSourceSymbol]
}

export function getRuntimeBinding<T>(name: string): T | undefined {
	const store = globalThis as RuntimeBindingStore
	const source = store[runtimeBindingSourceSymbol] ?? runtimeBindingSource
	return source?.[name] as T | undefined
}
