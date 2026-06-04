type RuntimeBindings = Record<string, unknown>

declare global {
	var __runtimeBindings: RuntimeBindings | undefined
}

function getRuntimeBinding(name: string) {
	return globalThis.__runtimeBindings?.[name]
}

export { getRuntimeBinding }
