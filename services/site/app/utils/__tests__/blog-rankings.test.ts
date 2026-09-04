import { expect, test } from 'vitest'
import {
	emptyTeamRankings,
	hasIncrementableRankings,
	incrementTeamRankings,
	rankingForTeam,
	withRankPercentages,
} from '../blog-rankings.ts'

test('incrementTeamRankings adds a logged-in read without changing other teams', () => {
	const before = withRankPercentages([
		rankingForTeam({
			team: 'RED',
			totalReads: 10,
			recentReads: 4,
			activeMembers: 2,
		}),
		rankingForTeam({
			team: 'BLUE',
			totalReads: 8,
			recentReads: 2,
			activeMembers: 2,
		}),
		rankingForTeam({
			team: 'YELLOW',
			totalReads: 1,
			recentReads: 0,
			activeMembers: 1,
		}),
	])

	const after = incrementTeamRankings(before, 'BLUE', { newlyActive: false })
	const blue = after.find((row) => row.team === 'BLUE')
	const red = after.find((row) => row.team === 'RED')

	expect(blue).toMatchObject({
		totalReads: 9,
		recentReads: 3,
		activeMembers: 2,
		ranking: 1.5,
	})
	expect(red).toMatchObject({
		totalReads: 10,
		recentReads: 4,
		activeMembers: 2,
	})
})

test('incrementTeamRankings treats a first-in-a-year reader as a new active member', () => {
	const before = emptyTeamRankings()
	const after = incrementTeamRankings(before, 'YELLOW', { newlyActive: true })
	const yellow = after.find((row) => row.team === 'YELLOW')

	expect(yellow).toMatchObject({
		totalReads: 1,
		recentReads: 1,
		activeMembers: 1,
		ranking: 1,
		percent: 1,
	})
})

test('hasIncrementableRankings rejects legacy cache entries without recentReads', () => {
	expect(
		hasIncrementableRankings([
			{ team: 'BLUE', totalReads: 3, ranking: 0.2, percent: 1 },
		]),
	).toBe(false)
	expect(hasIncrementableRankings(emptyTeamRankings())).toBe(true)
})
