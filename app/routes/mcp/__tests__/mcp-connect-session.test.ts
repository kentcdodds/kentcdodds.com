import { describe, expect, test } from 'vitest'
import { connect } from '../mcp.server.ts'

describe('mcp connect session lifecycle', () => {
	test('reuses existing transport for reconnecting session ids', async () => {
		const sessionId = `session-${crypto.randomUUID()}`
		const firstTransport = await connect({
			request: new Request('http://localhost/mcp', { method: 'POST' }),
			sessionId,
		})
		const secondTransport = await connect({
			request: new Request('http://localhost/mcp', { method: 'POST' }),
			sessionId,
		})

		expect(secondTransport).toBe(firstTransport)
		await firstTransport.close()
	})

	test('creates distinct transports for distinct session ids', async () => {
		const firstTransport = await connect({
			request: new Request('http://localhost/mcp', { method: 'POST' }),
			sessionId: `session-${crypto.randomUUID()}`,
		})
		const secondTransport = await connect({
			request: new Request('http://localhost/mcp', { method: 'POST' }),
			sessionId: `session-${crypto.randomUUID()}`,
		})

		expect(secondTransport).not.toBe(firstTransport)
		await Promise.all([firstTransport.close(), secondTransport.close()])
	})
})
