import { requireAuthInfoForMcpRequest } from '#app/routes/mcp/mcp-auth.server.ts'
import { connect } from '#app/routes/mcp/mcp.server.ts'
import {
	clearRuntimeEnvSource,
	setRuntimeEnvSource,
} from '#app/utils/env.server.ts'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'

export class McpDurableObject {
	private readonly env: Record<string, unknown>

	constructor(_state: unknown, env: Record<string, unknown>) {
		this.env = env
	}

	async fetch(request: Request) {
		if (request.headers.get('accept')?.includes('text/html')) {
			return Response.redirect(new URL('/about-mcp', request.url).toString(), 302)
		}

		try {
			setRuntimeEnvSource(getStringEnvBindings(this.env))
			setRuntimeBindingSource(this.env)
			const authInfo = await requireAuthInfoForMcpRequest(request)
			const sessionId = request.headers.get('mcp-session-id') ?? undefined
			const transport = await connect({ request, sessionId })
			return transport.handleRequest(request, { authInfo })
		} finally {
			clearRuntimeBindingSource()
			clearRuntimeEnvSource()
		}
	}
}

function getStringEnvBindings(env: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => {
			return typeof entry[1] === 'string'
		}),
	)
}
