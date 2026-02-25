let runtimeBindingSource: Record<string, unknown> | null = null

export function setRuntimeBindingSource(source: Record<string, unknown>) {
	runtimeBindingSource = source
}

export function clearRuntimeBindingSource() {
	runtimeBindingSource = null
}

export function getRuntimeBinding<T>(name: string): T | undefined {
	return runtimeBindingSource?.[name] as T | undefined
}
