import { beforeEach, describe, expect, test, vi } from 'vitest'

const mcpAuthMock = vi.hoisted(() => ({
	requireAuthInfoForMcpRequest: vi.fn(),
}))
const mcpServerMock = vi.hoisted(() => ({
	connect: vi.fn(),
}))

vi.mock('#app/routes/mcp/mcp-auth.server.ts', () => mcpAuthMock)
vi.mock('#app/routes/mcp/mcp.server.ts', () => mcpServerMock)

import { McpDurableObject } from '../mcp-durable-object.ts'

describe('mcp durable object', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('redirects html requests to about-mcp', async () => {
		const mcpObject = new McpDurableObject({}, {})
		const response = await mcpObject.fetch(
			new Request('https://kentcdodds.com/mcp', {
				headers: { accept: 'text/html' },
			}),
		)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe(
			'https://kentcdodds.com/about-mcp',
		)
		expect(mcpAuthMock.requireAuthInfoForMcpRequest).not.toHaveBeenCalled()
	})

	test('forwards authenticated requests to mcp transport', async () => {
		const authInfo = { token: 'token-value', extra: { userId: 'user-1' } }
		const handleRequest = vi.fn(async () => {
			return new Response('ok', { status: 202 })
		})
		mcpAuthMock.requireAuthInfoForMcpRequest.mockResolvedValue(authInfo)
		mcpServerMock.connect.mockResolvedValue({ handleRequest })

		const mcpObject = new McpDurableObject({}, { APP_ENV: 'test' })
		const request = new Request('https://kentcdodds.com/mcp', {
			method: 'POST',
			headers: {
				'mcp-session-id': 'session-123',
			},
		})
		const response = await mcpObject.fetch(request)

		expect(mcpAuthMock.requireAuthInfoForMcpRequest).toHaveBeenCalledWith(request)
		expect(mcpServerMock.connect).toHaveBeenCalledWith({
			request,
			sessionId: 'session-123',
		})
		expect(handleRequest).toHaveBeenCalledWith(request, { authInfo })
		expect(response.status).toBe(202)
		expect(await response.text()).toBe('ok')
	})

	test('propagates auth failures', async () => {
		mcpAuthMock.requireAuthInfoForMcpRequest.mockImplementation(async () => {
			throw new Response('Unauthorized', { status: 401 })
		})
		const mcpObject = new McpDurableObject({}, { APP_ENV: 'test' })
		const request = new Request('https://kentcdodds.com/mcp')

		await expect(mcpObject.fetch(request)).rejects.toMatchObject({
			status: 401,
		})
		expect(mcpServerMock.connect).not.toHaveBeenCalled()
	})
})
