// Defer @modelcontextprotocol/sdk (~214KB minified) until MCP routes run so the
// production app-worker bundle does not evaluate it on cold Worker Loader starts.
type McpSdkModule = typeof import('./mcp-sdk.server.ts')
type McpRuntimeModule = typeof import('./mcp.runtime.server.ts')

let mcpSdkPromise: Promise<McpSdkModule> | undefined
let mcpRuntimePromise: Promise<McpRuntimeModule> | undefined

export async function getMcpSdk(): Promise<McpSdkModule> {
	mcpSdkPromise ??= import('./mcp-sdk.server.ts')
	return mcpSdkPromise
}

export async function getMcpRuntime(): Promise<McpRuntimeModule> {
	mcpRuntimePromise ??= import('./mcp.runtime.server.ts')
	return mcpRuntimePromise
}
