import {
	deleteExpiredSessions,
	deleteExpiredVerifications,
} from '#app/utils/prisma.server.ts'

export async function runExpiredDataCleanup({
	reason,
}: {
	reason: string
}) {
	const deletedSessionsCount = await deleteExpiredSessions()
	const deletedVerificationsCount = await deleteExpiredVerifications()
	if (deletedSessionsCount > 0 || deletedVerificationsCount > 0) {
		console.info(
			`expired-data-cleanup: deleted ${deletedSessionsCount} expired sessions and ${deletedVerificationsCount} expired verifications (${reason})`,
		)
	}

	return {
		didRun: true,
		deletedSessionsCount,
		deletedVerificationsCount,
	}
}
