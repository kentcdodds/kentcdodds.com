import { getDomainUrl } from '#app/utils/misc.js'
import { getMcpSdk } from './mcp-lazy.server.ts'
import {
	mcpServerName,
	mcpServerTransportPath,
	mcpServerVersion,
} from './server-card.ts'

export async function createMcpServerCard(request: Request) {
	const { SUPPORTED_PROTOCOL_VERSIONS } = await getMcpSdk()
	const endpoint = `${getDomainUrl(request)}${mcpServerTransportPath}`

	return {
		$schema:
			'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
		name: mcpServerName,
		version: mcpServerVersion,
		description:
			'Authenticated MCP server for kentcdodds.com account, content, and search tools.',
		title: 'Kent C. Dodds MCP Server',
		websiteUrl: 'https://kentcdodds.com/about-mcp',
		serverInfo: {
			name: mcpServerName,
			version: mcpServerVersion,
		},
		capabilities: {
			tools: { dynamic: false },
			resources: { dynamic: false },
			prompts: { dynamic: false },
		},
		transport: {
			type: 'streamable-http',
			endpoint,
		},
		remotes: [
			{
				type: 'streamable-http',
				url: endpoint,
				supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
			},
		],
	}
}
