import { getInstanceInfo } from '#app/utils/litefs-js.server.ts'
import {
	deleteExpiredSessions,
	deleteExpiredVerifications,
} from '#app/utils/prisma.server.ts'

export async function runExpiredDataCleanup({
	reason,
}: {
	reason: string
}) {
	const { currentIsPrimary, currentInstance, primaryInstance } =
		await getInstanceInfo()
	if (!currentIsPrimary) {
		return {
			didRun: false,
			deletedSessionsCount: 0,
			deletedVerificationsCount: 0,
			currentInstance,
			primaryInstance,
		}
	}

	const deletedSessionsCount = await deleteExpiredSessions()
	const deletedVerificationsCount = await deleteExpiredVerifications()
	if (deletedSessionsCount > 0 || deletedVerificationsCount > 0) {
		console.info(
			`expired-data-cleanup: deleted ${deletedSessionsCount} expired sessions and ${deletedVerificationsCount} expired verifications (${reason})`,
			{
				currentInstance,
				primaryInstance,
			},
		)
	}

	return {
		didRun: true,
		deletedSessionsCount,
		deletedVerificationsCount,
		currentInstance,
		primaryInstance,
	}
}
