import { describe, expect, test, vi } from 'vitest'
import { loader } from '../draft-status-stream.ts'

const { findUniqueMock, requireAdminUserMock } = vi.hoisted(() => ({
	findUniqueMock: vi.fn(),
	requireAdminUserMock: vi.fn(),
}))

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		callKentEpisodeDraft: {
			findUnique: findUniqueMock,
		},
	},
}))

vi.mock('#app/utils/session.server.ts', () => ({
	requireAdminUser: requireAdminUserMock,
}))

describe('draft-status-stream resource', () => {
	function resetMocks() {
		vi.clearAllMocks()
		requireAdminUserMock.mockResolvedValue(undefined)
	}

	test('returns 400 when callId is missing', async () => {
		resetMocks()
		await expect(
			loader({
				request: new Request(
					'http://example.test/resources/calls/draft-status-stream',
				),
			} as never),
		).rejects.toMatchObject({ status: 400 })
	})

	test('streams initial draft status payload', async () => {
		resetMocks()
		findUniqueMock.mockResolvedValue({
			status: 'PROCESSING',
			step: 'TRANSCRIBING',
			errorMessage: null,
		})
		const abortController = new AbortController()
		const response = await loader({
			request: new Request(
				'http://example.test/resources/calls/draft-status-stream?callId=call_123',
				{ signal: abortController.signal },
			),
		} as never)

		expect(response.headers.get('Content-Type')).toBe('text/event-stream')
		const reader = response.body?.getReader()
		expect(reader).toBeTruthy()
		const firstChunk = await reader!.read()
		const payload = new TextDecoder().decode(firstChunk.value)
		expect(payload).toContain('"status":"PROCESSING"')
		expect(payload).toContain('"step":"TRANSCRIBING"')

		abortController.abort()
		await reader!.cancel()
	})

	test('streams once and closes for non-processing status', async () => {
		resetMocks()
		findUniqueMock.mockResolvedValue({
			status: 'READY',
			step: 'DONE',
			errorMessage: null,
		})
		const response = await loader({
			request: new Request(
				'http://example.test/resources/calls/draft-status-stream?callId=call_456',
			),
		} as never)

		expect(await response.text()).toContain('"status":"READY"')
		expect(findUniqueMock).toHaveBeenCalledTimes(1)
	})
})
