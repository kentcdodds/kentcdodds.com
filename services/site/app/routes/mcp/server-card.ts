import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js'
import { getDomainUrl } from '#app/utils/misc.js'

export const mcpServerName = 'kentcdodds.com'
export const mcpServerVersion = '1.0.0'
export const mcpServerTransportPath = '/mcp'
export const mcpSupportedProtocolVersions = SUPPORTED_PROTOCOL_VERSIONS

export function createMcpServerCard(request: Request) {
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
			tools: { dynamic: true },
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
				supportedProtocolVersions: mcpSupportedProtocolVersions,
			},
		],
	}
}
