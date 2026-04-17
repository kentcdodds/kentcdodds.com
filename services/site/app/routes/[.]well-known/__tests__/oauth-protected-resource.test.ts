// @vitest-environment node
import { expect, test } from 'vitest'
import { loader } from '../oauth-protected-resource.$.ts'

type MetadataResult = {
	type?: string
	data?: unknown
	init?: ResponseInit | null
}

test('serves root protected resource metadata for the site origin', async () => {
	const result = (await loader({
		request: new Request(
			'https://kentcdodds.com/.well-known/oauth-protected-resource',
		),
	} as any)) as MetadataResult

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({
		resource: 'https://kentcdodds.com',
		authorization_servers: [
			'https://kcd-oauth-provider.kentcdodds.workers.dev',
		],
		scopes_supported: ['mcp:tools'],
		bearer_methods_supported: ['header'],
		resource_name: 'kentcdodds.com APIs',
	})
})

test('serves path-specific metadata for the MCP protected resource', async () => {
	const result = (await loader({
		request: new Request(
			'https://kentcdodds.com/.well-known/oauth-protected-resource/mcp',
		),
	} as any)) as MetadataResult

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({
		resource: 'https://kentcdodds.com/mcp',
		authorization_servers: [
			'https://kcd-oauth-provider.kentcdodds.workers.dev',
		],
		scopes_supported: ['mcp:tools'],
		bearer_methods_supported: ['header'],
		resource_name: 'KCD MCP server',
	})
})
