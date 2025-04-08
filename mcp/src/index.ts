import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'
import app from './app'

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: 'Demo',
		version: '1.0.0',
	})

	async init() {
		this.server.tool(
			'add',
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: 'text', text: String(a + b) }],
			}),
		)
	}
}

// Export the OAuth handler as the default
export default new OAuthProvider({
	apiRoute: '/sse',
	// TODO: fix these types
	// @ts-ignore
	apiHandler: MyMCP.mount('/sse'),
	// @ts-ignore
	defaultHandler: app,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
})
