import { afterEach, expect, test, vi } from 'vitest'

const { mockDeleteExpiredSessions, mockDeleteExpiredVerifications } = vi.hoisted(
	() => {
		return {
			mockDeleteExpiredSessions: vi.fn(),
			mockDeleteExpiredVerifications: vi.fn(),
		}
	},
)

vi.mock('#app/utils/prisma.server.ts', () => ({
	deleteExpiredSessions: mockDeleteExpiredSessions,
	deleteExpiredVerifications: mockDeleteExpiredVerifications,
}))

import { runExpiredDataCleanup } from '#app/utils/expired-data-cleanup.server.ts'

afterEach(() => {
	vi.clearAllMocks()
})

test('runExpiredDataCleanup deletes expired records', async () => {
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
		)
	} finally {
		infoSpy.mockRestore()
	}
})
