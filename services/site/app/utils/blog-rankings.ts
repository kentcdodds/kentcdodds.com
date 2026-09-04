import { type Team } from '#app/types.ts'
import { teams } from '#app/utils/misc.ts'

export type BlogReadRanking = {
	team: Team
	totalReads: number
	recentReads: number
	activeMembers: number
	ranking: number
	percent: number
}

export type BlogReadRankingDraft = Omit<BlogReadRanking, 'percent'>

export function rankingForTeam({
	team,
	totalReads,
	recentReads,
	activeMembers,
}: {
	team: Team
	totalReads: number
	recentReads: number
	activeMembers: number
}): BlogReadRankingDraft {
	return {
		team,
		totalReads,
		recentReads,
		activeMembers,
		ranking: activeMembers
			? Number((recentReads / activeMembers).toFixed(4))
			: 0,
	}
}

export function withRankPercentages(
	rawRankingData: ReadonlyArray<BlogReadRankingDraft>,
): Array<BlogReadRanking> {
	const rankings = rawRankingData.map((row) => row.ranking)
	const maxRanking = Math.max(...rankings)
	const minRanking = Math.min(...rankings)
	const span = maxRanking - minRanking || 1
	return rawRankingData.map((row) => ({
		...row,
		percent: Number(((row.ranking - minRanking) / span).toFixed(2)),
	}))
}

export function emptyTeamRankings(): Array<BlogReadRanking> {
	return withRankPercentages(
		teams.map((team) =>
			rankingForTeam({
				team,
				totalReads: 0,
				recentReads: 0,
				activeMembers: 0,
			}),
		),
	)
}

export function hasIncrementableRankings(
	value: unknown,
): value is Array<BlogReadRanking> {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every(
			(row) =>
				typeof row === 'object' &&
				row !== null &&
				'team' in row &&
				typeof row.totalReads === 'number' &&
				typeof row.recentReads === 'number' &&
				typeof row.activeMembers === 'number' &&
				typeof row.ranking === 'number',
		)
	)
}

export function incrementTeamRankings(
	rankings: ReadonlyArray<BlogReadRanking>,
	team: Team,
	{ newlyActive }: { newlyActive: boolean },
): Array<BlogReadRanking> {
	const byTeam = new Map(rankings.map((row) => [row.team, row]))
	return withRankPercentages(
		teams.map((nextTeam) => {
			const current = byTeam.get(nextTeam)
			if (nextTeam !== team) {
				return (
					current ??
					rankingForTeam({
						team: nextTeam,
						totalReads: 0,
						recentReads: 0,
						activeMembers: 0,
					})
				)
			}
			return rankingForTeam({
				team: nextTeam,
				totalReads: (current?.totalReads ?? 0) + 1,
				recentReads: (current?.recentReads ?? 0) + 1,
				activeMembers: (current?.activeMembers ?? 0) + (newlyActive ? 1 : 0),
			})
		}),
	)
}
