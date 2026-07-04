import { createDatabase } from '@remix-run/data-table'
import { lt } from '@remix-run/data-table'
import { createSqliteExecutorDataTableAdapter } from '../../site/app/utils/db/d1-data-table-adapter.server.ts'
import { createDirectD1Executor } from '../../site/app/utils/db/d1-sql-executor.server.ts'
import {
	sessionTable,
	verificationTable,
} from '../../site/app/utils/db/schema.server.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'

export async function deleteExpiredSessionsAndVerifications(
	env: ParentWorkerEnv,
	now = new Date(),
) {
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createDirectD1Executor(env.APP_DB)),
		{ now: () => new Date() },
	)

	const [sessions, verifications] = await Promise.all([
		db.deleteMany(sessionTable, {
			where: lt('expirationDate', now),
		}),
		db.deleteMany(verificationTable, {
			where: lt('expiresAt', now),
		}),
	])

	return {
		deletedSessionsCount: sessions.affectedRows,
		deletedVerificationsCount: verifications.affectedRows,
	}
}
