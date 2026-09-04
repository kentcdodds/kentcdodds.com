import { and, eq, gt, sql } from '@remix-run/data-table'
import { db } from '#app/utils/db.server.ts'
import { postReadTable } from '#app/utils/db/schema.server.ts'
import { type Team } from '#app/types.ts'
import {
	emptyTeamRankings,
	rankingForTeam,
	withRankPercentages,
	type BlogReadRanking,
} from '#app/utils/blog-rankings.ts'
import { teams } from '#app/utils/misc.ts'

export function postReadReaderId(kind: 'user' | 'client', id: string) {
	return kind === 'user' ? `u:${id}` : `c:${id}`
}

export function incrementPostReadSlugCountSql(postSlug: string) {
	return sql`
		INSERT INTO "PostReadSlugCount" ("postSlug", "count")
		VALUES (${postSlug}, 1)
		ON CONFLICT("postSlug") DO UPDATE SET "count" = "count" + 1
	`
}

export function listPostReadSlugCountsSql() {
	return sql`SELECT "postSlug", "count" FROM "PostReadSlugCount"`
}

export function countPostReadReadersSql() {
	return sql`SELECT COUNT(*) as count FROM "PostReadReader"`
}

export function insertPostReadReaderSql(kind: 'user' | 'client', id: string) {
	return sql`
		INSERT OR IGNORE INTO "PostReadReader" ("id", "kind")
		VALUES (${postReadReaderId(kind, id)}, ${kind})
	`
}

export function teamReadStatsSql({
	slug,
	recentAfter,
}: {
	slug?: string
	recentAfter: Date
}) {
	const recentAfterIso = recentAfter.toISOString()
	if (slug) {
		return sql`
			SELECT u."team" as team,
				COUNT(*) as totalReads,
				SUM(CASE WHEN pr."createdAt" > ${recentAfterIso} THEN 1 ELSE 0 END) as recentReads
			FROM "PostRead" pr
			INNER JOIN "User" u ON pr."userId" = u."id"
			WHERE pr."postSlug" = ${slug}
			GROUP BY u."team"
		`
	}
	return sql`
		SELECT u."team" as team,
			COUNT(*) as totalReads,
			SUM(CASE WHEN pr."createdAt" > ${recentAfterIso} THEN 1 ELSE 0 END) as recentReads
		FROM "User" u
		INNER JOIN "PostRead" pr ON pr."userId" = u."id"
		GROUP BY u."team"
	`
}

export function activeMembersByTeamSql(since: Date) {
	return sql`
		SELECT u."team" as team, COUNT(DISTINCT u."id") as count
		FROM "User" u
		INNER JOIN "PostRead" pr ON pr."userId" = u."id"
		WHERE pr."createdAt" > ${since.toISOString()}
		GROUP BY u."team"
	`
}

async function numberFromCountResult(result: {
	rows?: Array<Record<string, unknown>>
	affectedRows?: number
}) {
	return Number(result.rows?.[0]?.count ?? result.affectedRows ?? 0)
}

export async function incrementPostReadSlugCount(postSlug: string) {
	await db.exec(incrementPostReadSlugCountSql(postSlug))
}

export async function recordPostReadReader(
	kind: 'user' | 'client',
	id: string,
) {
	const result = await db.exec(insertPostReadReaderSql(kind, id))
	return Number(result.affectedRows ?? 0) > 0
}

export async function listPostReadSlugCounts() {
	const result = await db.exec(listPostReadSlugCountsSql())
	return Object.fromEntries(
		(result.rows ?? []).map((row) => [String(row.postSlug), Number(row.count)]),
	) as Record<string, number>
}

export async function countPostReadReaders() {
	const result = await db.exec(countPostReadReadersSql())
	return numberFromCountResult(result)
}

export async function userHasPostReadSince({
	userId,
	since,
}: {
	userId: string
	since: Date
}) {
	const existing = await db.findOne(postReadTable, {
		where: and(eq('userId', userId), gt('createdAt', since)),
	})
	return Boolean(existing)
}

export async function migrateClientPostReadsToUser({
	userId,
	clientId,
}: {
	userId: string
	clientId: string
}) {
	await db.updateMany(
		postReadTable,
		{ userId, clientId: null },
		{ where: { clientId } },
	)
	await db.exec(insertPostReadReaderSql('user', userId))
	await db.exec(
		sql`DELETE FROM "PostReadReader" WHERE "id" = ${postReadReaderId('client', clientId)}`,
	)
}

function teamCountMap(
	rows: Array<Record<string, unknown>> | undefined,
	valueKey: 'totalReads' | 'recentReads' | 'count',
) {
	const counts = new Map<Team, number>()
	for (const row of rows ?? []) {
		const team = row.team
		if (typeof team !== 'string') continue
		if (!teams.includes(team as Team)) continue
		counts.set(team as Team, Number(row[valueKey] ?? 0))
	}
	return counts
}

export async function loadBlogReadRankings({
	slug,
	recentAfter,
	activeSince,
}: {
	slug?: string
	recentAfter: Date
	activeSince: Date
}): Promise<Array<BlogReadRanking>> {
	const [readStatsResult, activeMembersResult] = await Promise.all([
		db.exec(teamReadStatsSql({ slug, recentAfter })),
		db.exec(activeMembersByTeamSql(activeSince)),
	])
	const totalReads = teamCountMap(readStatsResult.rows, 'totalReads')
	const recentReads = teamCountMap(readStatsResult.rows, 'recentReads')
	const activeMembers = teamCountMap(activeMembersResult.rows, 'count')
	if (
		totalReads.size === 0 &&
		recentReads.size === 0 &&
		activeMembers.size === 0
	) {
		return emptyTeamRankings()
	}
	return withRankPercentages(
		teams.map((team) =>
			rankingForTeam({
				team,
				totalReads: totalReads.get(team) ?? 0,
				recentReads: recentReads.get(team) ?? 0,
				activeMembers: activeMembers.get(team) ?? 0,
			}),
		),
	)
}
