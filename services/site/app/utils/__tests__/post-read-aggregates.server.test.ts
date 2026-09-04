import { createDatabase } from '@remix-run/data-table'
import { expect, test } from 'vitest'
import {
	incrementTeamRankings,
	rankingForTeam,
	withRankPercentages,
} from '../blog-rankings.ts'
import { createSqliteExecutorDataTableAdapter } from '../db/d1-data-table-adapter.server.ts'
import { postReadTable, userTable } from '../db/schema.server.ts'
import {
	createMigratedMemoryDatabase,
	createNodeSqliteExecutor,
} from '../db/test-helpers.server.ts'

function explain(
	sqlite: ReturnType<typeof createMigratedMemoryDatabase>,
	sql: string,
) {
	return sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as Array<{
		detail: string
	}>
}

function planMentions(
	plan: Array<{ detail: string }>,
	needle: string | RegExp,
) {
	return plan.some((row) =>
		typeof needle === 'string'
			? row.detail.includes(needle)
			: needle.test(row.detail),
	)
}

const scansPostReadTable = /SCAN (?:TABLE )?"?PostRead(?!Slug|Reader)/

test('slug-count and reader-count plans avoid scanning PostRead', () => {
	const sqlite = createMigratedMemoryDatabase()
	const slugPlan = explain(
		sqlite,
		`SELECT "postSlug", "count" FROM "PostReadSlugCount"`,
	)
	const readerPlan = explain(
		sqlite,
		`SELECT COUNT(*) as count FROM "PostReadReader"`,
	)
	const legacyGroupPlan = explain(
		sqlite,
		`SELECT "postSlug", count(*) as count FROM "PostRead" GROUP BY "postSlug"`,
	)

	expect(planMentions(slugPlan, 'PostReadSlugCount')).toBe(true)
	expect(planMentions(slugPlan, scansPostReadTable)).toBe(false)
	expect(planMentions(readerPlan, 'PostReadReader')).toBe(true)
	expect(planMentions(readerPlan, scansPostReadTable)).toBe(false)
	expect(planMentions(legacyGroupPlan, scansPostReadTable)).toBe(true)
	sqlite.close()
})

test('slug-filtered ranking plan uses the postSlug index instead of scanning PostRead', () => {
	const sqlite = createMigratedMemoryDatabase()
	const plan = explain(
		sqlite,
		`SELECT u."team" as team, COUNT(*) as totalReads
		 FROM "PostRead" pr
		 INNER JOIN "User" u ON pr."userId" = u."id"
		 WHERE pr."postSlug" = 'some-post'
		 GROUP BY u."team"`,
	)

	expect(
		planMentions(plan, 'PostRead_postSlug_createdAt_idx') ||
			planMentions(plan, 'SEARCH PostRead'),
	).toBe(true)
	expect(planMentions(plan, scansPostReadTable)).toBe(false)
	sqlite.close()
})

test('grouped ranking SQL matches per-team PostRead joins used by the old 9-query path', async () => {
	const sqlite = createMigratedMemoryDatabase()
	const db = createDatabase(
		createSqliteExecutorDataTableAdapter(createNodeSqliteExecutor(sqlite)),
		{ now: () => new Date('2026-09-04T00:00:00.000Z') },
	)
	const red = await db.create(
		userTable,
		{
			email: 'red@example.com',
			firstName: 'Red',
			team: 'RED',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)
	const blue = await db.create(
		userTable,
		{
			email: 'blue@example.com',
			firstName: 'Blue',
			team: 'BLUE',
			role: 'MEMBER',
		},
		{ returnRow: true },
	)

	await db.create(postReadTable, {
		userId: red.id,
		postSlug: 'popular-post',
		createdAt: new Date('2026-08-01T00:00:00.000Z'),
	})
	await db.create(postReadTable, {
		userId: red.id,
		postSlug: 'popular-post',
		createdAt: new Date('2026-03-01T00:00:00.000Z'),
	})
	await db.create(postReadTable, {
		userId: blue.id,
		postSlug: 'other-post',
		createdAt: new Date('2026-08-15T00:00:00.000Z'),
	})

	const recentAfter = new Date('2026-03-04T00:00:00.000Z')
	const activeSince = new Date('2025-09-04T00:00:00.000Z')
	const readStats = sqlite
		.prepare(
			`SELECT u."team" as team,
				COUNT(*) as totalReads,
				SUM(CASE WHEN pr."createdAt" > ? THEN 1 ELSE 0 END) as recentReads
			FROM "PostRead" pr
			INNER JOIN "User" u ON pr."userId" = u."id"
			WHERE pr."postSlug" = ?
			GROUP BY u."team"`,
		)
		.all(recentAfter.toISOString(), 'popular-post') as Array<{
		team: string
		totalReads: number
		recentReads: number
	}>
	const active = sqlite
		.prepare(
			`SELECT u."team" as team, COUNT(DISTINCT u."id") as count
			FROM "User" u
			INNER JOIN "PostRead" pr ON pr."userId" = u."id"
			WHERE pr."createdAt" > ?
			GROUP BY u."team"`,
		)
		.all(activeSince.toISOString()) as Array<{
		team: string
		count: number
	}>

	expect(readStats).toEqual([{ team: 'RED', totalReads: 2, recentReads: 1 }])
	expect(active).toEqual(
		expect.arrayContaining([
			{ team: 'RED', count: 1 },
			{ team: 'BLUE', count: 1 },
		]),
	)

	const before = withRankPercentages([
		rankingForTeam({
			team: 'RED',
			totalReads: 2,
			recentReads: 1,
			activeMembers: 1,
		}),
		rankingForTeam({
			team: 'BLUE',
			totalReads: 0,
			recentReads: 0,
			activeMembers: 1,
		}),
		rankingForTeam({
			team: 'YELLOW',
			totalReads: 0,
			recentReads: 0,
			activeMembers: 0,
		}),
	])
	const after = incrementTeamRankings(before, 'RED', { newlyActive: false })
	expect(after.find((row) => row.team === 'RED')).toMatchObject({
		totalReads: 3,
		recentReads: 2,
		activeMembers: 1,
		ranking: 2,
	})

	sqlite.close()
})

test('PostReadSlugCount and PostReadReader stay in sync with increment SQL', () => {
	const sqlite = createMigratedMemoryDatabase()
	sqlite
		.prepare(
			`INSERT INTO "PostReadSlugCount" ("postSlug", "count") VALUES (?, 1)
			 ON CONFLICT("postSlug") DO UPDATE SET "count" = "count" + 1`,
		)
		.run('popular-post')
	sqlite
		.prepare(
			`INSERT INTO "PostReadSlugCount" ("postSlug", "count") VALUES (?, 1)
			 ON CONFLICT("postSlug") DO UPDATE SET "count" = "count" + 1`,
		)
		.run('popular-post')
	sqlite
		.prepare(
			`INSERT OR IGNORE INTO "PostReadReader" ("id", "kind") VALUES (?, ?)`,
		)
		.run('u:user-1', 'user')
	const ignored = sqlite
		.prepare(
			`INSERT OR IGNORE INTO "PostReadReader" ("id", "kind") VALUES (?, ?)`,
		)
		.run('u:user-1', 'user')

	const slugCount = sqlite
		.prepare(`SELECT "count" FROM "PostReadSlugCount" WHERE "postSlug" = ?`)
		.get('popular-post') as { count: number }
	const readerCount = sqlite
		.prepare(`SELECT COUNT(*) as count FROM "PostReadReader"`)
		.get() as { count: number }

	expect(slugCount.count).toBe(2)
	expect(readerCount.count).toBe(1)
	expect(Number(ignored.changes)).toBe(0)
	sqlite.close()
})

test('PostReadSlugCount stays an order of magnitude smaller than PostRead after backfill', () => {
	const sqlite = createMigratedMemoryDatabase()
	const insertUser = sqlite.prepare(
		`INSERT INTO "User" ("id", "createdAt", "updatedAt", "email", "firstName", "role", "team")
		 VALUES (?, ?, ?, ?, ?, 'MEMBER', 'BLUE')`,
	)
	const insertRead = sqlite.prepare(
		`INSERT INTO "PostRead" ("id", "createdAt", "userId", "postSlug")
		 VALUES (?, ?, ?, ?)`,
	)
	const now = '2026-09-04T00:00:00.000Z'
	for (let userIndex = 0; userIndex < 20; userIndex += 1) {
		const userId = `user-${userIndex}`
		insertUser.run(userId, now, now, `user-${userIndex}@example.com`, 'Reader')
		for (let readIndex = 0; readIndex < 100; readIndex += 1) {
			insertRead.run(
				`read-${userIndex}-${readIndex}`,
				now,
				userId,
				`post-${readIndex % 20}`,
			)
		}
	}
	sqlite.exec(`
		INSERT INTO "PostReadSlugCount" ("postSlug", "count")
		SELECT "postSlug", COUNT(*) FROM "PostRead" GROUP BY "postSlug"
		ON CONFLICT("postSlug") DO UPDATE SET "count" = excluded."count"
	`)

	const postReadRows = (
		sqlite.prepare(`SELECT COUNT(*) as count FROM "PostRead"`).get() as {
			count: number
		}
	).count
	const slugRows = (
		sqlite
			.prepare(`SELECT COUNT(*) as count FROM "PostReadSlugCount"`)
			.get() as {
			count: number
		}
	).count

	expect(postReadRows).toBe(2000)
	expect(slugRows).toBe(20)
	expect(slugRows * 10).toBeLessThanOrEqual(postReadRows)
	sqlite.close()
})
