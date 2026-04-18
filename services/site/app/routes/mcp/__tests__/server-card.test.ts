import { expect, test } from 'vitest'
import {
	createMcpServerCard,
	mcpServerName,
	mcpServerTransportPath,
	mcpServerVersion,
} from '../server-card.ts'

test('createMcpServerCard returns discovery metadata for the local MCP transport', () => {
	const request = new Request(
		'https://kentcdodds.com/.well-known/mcp/server-card.json',
		{ headers: { host: 'kentcdodds.com' } },
	)
	const card = createMcpServerCard(request)

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
