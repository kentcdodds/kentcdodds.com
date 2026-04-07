import { type Team } from '#app/types.ts'

export type TeamRanking = {
	totalCount: number
	team: Team
	percent: number
	ranking: number
}

export function getRankingLeader<Ranking extends { ranking: number }>(
	rankings?: Array<Ranking>,
) {
	if (!rankings) return null

	return rankings.reduce((leader: Ranking | null, rank) => {
		if (rank.ranking <= 0) return leader
		if (!leader || rank.ranking > leader.ranking) return rank
		return leader
	}, null)
}
