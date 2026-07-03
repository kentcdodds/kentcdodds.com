import type { PrismaClient } from '../generated/prisma-client/client.ts'

export async function deleteExpiredSessionsAndVerifications(
	prisma: PrismaClient,
	now = new Date(),
) {
	const [sessions, verifications] = await Promise.all([
		prisma.session.deleteMany({
			where: { expirationDate: { lt: now } },
		}),
		prisma.verification.deleteMany({
			where: { expiresAt: { lt: now } },
		}),
	])

	return {
		deletedSessionsCount: sessions.count,
		deletedVerificationsCount: verifications.count,
	}
}
