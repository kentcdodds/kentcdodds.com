import { expect, test } from 'vitest'
import { createMcpServerCard } from '../create-mcp-server-card.server.ts'
import {
	mcpServerName,
	mcpServerTransportPath,
	mcpServerVersion,
} from '../server-card.ts'

test('createMcpServerCard returns discovery metadata for the local MCP transport', async () => {
	const request = new Request(
		'https://kentcdodds.com/.well-known/mcp/server-card.json',
		{ headers: { host: 'kentcdodds.com' } },
	)
	const card = await createMcpServerCard(request)

	expect(card.serverInfo).toEqual({
		name: mcpServerName,
		version: mcpServerVersion,
	})
	expect(card.transport).toEqual({
		type: 'streamable-http',
		endpoint: `https://kentcdodds.com${mcpServerTransportPath}`,
	})
	expect(card.capabilities).toEqual({
		tools: { dynamic: false },
		resources: { dynamic: false },
		prompts: { dynamic: false },
	})
	expect(card.remotes).toEqual([
		expect.objectContaining({
			type: 'streamable-http',
			url: `https://kentcdodds.com${mcpServerTransportPath}`,
		}),
	])
})
