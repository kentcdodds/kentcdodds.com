import { afterEach, expect, test, vi } from 'vitest'

const { mockDeleteExpiredSessions, mockDeleteExpiredVerifications, mockGetInstanceInfo } =
	vi.hoisted(() => {
		return {
			mockGetInstanceInfo: vi.fn(),
			mockDeleteExpiredSessions: vi.fn(),
			mockDeleteExpiredVerifications: vi.fn(),
		}
	})

vi.mock('#app/utils/litefs-js.server.ts', () => ({
	getInstanceInfo: mockGetInstanceInfo,
}))

vi.mock('#app/utils/prisma.server.ts', () => ({
	deleteExpiredSessions: mockDeleteExpiredSessions,
	deleteExpiredVerifications: mockDeleteExpiredVerifications,
}))

import { runExpiredDataCleanup } from '#app/utils/expired-data-cleanup.server.ts'

afterEach(() => {
	vi.clearAllMocks()
})

test('runExpiredDataCleanup skips cleanup when not primary', async () => {
	mockGetInstanceInfo.mockResolvedValue({
		currentIsPrimary: false,
		currentInstance: 'secondary-a',
		primaryInstance: 'primary-a',
	})

	const result = await runExpiredDataCleanup({ reason: 'test-secondary' })

	expect(result.didRun).toBe(false)
	expect(mockDeleteExpiredSessions).not.toHaveBeenCalled()
	expect(mockDeleteExpiredVerifications).not.toHaveBeenCalled()
})

test('runExpiredDataCleanup deletes expired records when primary', async () => {
	mockGetInstanceInfo.mockResolvedValue({
		currentIsPrimary: true,
		currentInstance: 'primary-a',
		primaryInstance: 'primary-a',
	})
	mockDeleteExpiredSessions.mockResolvedValue(3)
	mockDeleteExpiredVerifications.mockResolvedValue(5)
	const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

	try {
		const result = await runExpiredDataCleanup({ reason: 'test-primary' })
		expect(result.didRun).toBe(true)
		expect(result.deletedSessionsCount).toBe(3)
		expect(result.deletedVerificationsCount).toBe(5)
		expect(infoSpy).toHaveBeenCalledWith(
			expect.stringContaining('expired-data-cleanup: deleted 3 expired sessions'),
			expect.objectContaining({
				currentInstance: 'primary-a',
				primaryInstance: 'primary-a',
			}),
		)
	} finally {
		infoSpy.mockRestore()
	}
})
