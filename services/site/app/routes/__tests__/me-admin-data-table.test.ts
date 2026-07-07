import { addDays, startOfDay, subDays } from 'date-fns'
import { eq, gt, gte, like, or, sql } from '@remix-run/data-table'
import { createDatabase } from '@remix-run/data-table'
import { afterEach, expect, test } from 'vitest'
import { createSqliteExecutorDataTableAdapter } from '#app/utils/db/d1-data-table-adapter.server.ts'
import {
	callTable,
	passkeyTable,
	postReadTable,
	sessionTable,
	userTable,
} from '#app/utils/db/schema.server.ts'
import {
	createMigratedMemoryDatabase,
	createNodeSqliteExecutor,
} from '#app/utils/db/test-helpers.server.ts'
import { clearRuntimeBindingSource } from '#app/utils/runtime-bindings.server.ts'

afterEach(() => {
	clearRuntimeBindingSource()
})

test('admin dashboard queries return user list, counts, and trend aggregates', async () => {
	const sqlite = createMigratedMemoryDatabase()
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createNodeSqliteExecutor(sqlite)),
		{ now: () => new Date() },
	)

	const user = await db.create(
		userTable,
		{
			email: 'me@kentcdodds.com',
			firstName: 'Kent',
			team: 'BLUE',
			role: 'ADMIN',
		},
		{ returnRow: true },
	)
	await db.create(postReadTable, {
		userId: user.id,
		postSlug: 'popular-post',
	})
	await db.create(sessionTable, {
		userId: user.id,
		expirationDate: addDays(new Date(), 7),
	})

	const now = new Date()
	const today = startOfDay(now)
	const start7 = subDays(today, 6)
	const trendStart = subDays(today, 13)

	const [users, totalUsers, signupDailyResult, teamCountsResult] =
		await Promise.all([
			db
				.query(userTable)
				.select('createdAt', 'firstName', 'email', 'id', 'team', 'role')
				.where(or(like('email', '%kent%'), eq('team', 'BLUE')))
				.orderBy('createdAt', 'asc')
				.limit(100)
				.all(),
			db.count(userTable),
			db.exec(sql`
				SELECT DATE("createdAt", 'localtime') AS day, COUNT(*) AS count
				FROM "User"
				WHERE DATE("createdAt", 'localtime') >= DATE(${trendStart}, 'localtime')
				GROUP BY DATE("createdAt", 'localtime')
				ORDER BY day ASC
			`),
			db.exec(sql`
				SELECT "team", COUNT(*) AS count
				FROM "User"
				GROUP BY "team"
				ORDER BY count DESC
			`),
		])

	expect(users).toHaveLength(1)
	expect(users[0]?.email).toBe('me@kentcdodds.com')
	expect(totalUsers).toBe(1)
	expect(signupDailyResult.rows?.length).toBeGreaterThan(0)
	expect(Number(signupDailyResult.rows?.[0]?.count)).toBe(1)
	expect(teamCountsResult.rows?.[0]?.team).toBe('BLUE')

	await db.count(callTable)
	await db.count(passkeyTable)
	await db.count(sessionTable, { where: gt('expirationDate', now) })
	await db.count(postReadTable, { where: gte('createdAt', start7) })
	await db.delete(userTable, user.id)

	const remainingUsers = await db.count(userTable)
	expect(remainingUsers).toBe(0)
})
