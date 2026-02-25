type MdxRemoteRuntimeContext = {
	scope: Record<string, unknown>
	allowCalls?: Record<string, (...args: Array<unknown>) => unknown>
}

function createMdxRemoteRuntimeContext({
	scope = {},
	allowCalls,
}: {
	scope?: Record<string, unknown>
	allowCalls?: Record<string, (...args: Array<unknown>) => unknown>
} = {}): MdxRemoteRuntimeContext {
	return { scope, allowCalls }
}

export { createMdxRemoteRuntimeContext }
export type { MdxRemoteRuntimeContext }
