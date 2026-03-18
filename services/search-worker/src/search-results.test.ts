import type { SearchResult } from '@kcd-internal/search-shared'
import { expect, test } from 'vitest'
import {
	filterFusedResultsByConfidence,
	fuseRankedResultsAll,
	SEARCH_CONFIDENCE_MIN_BEST_SCORE,
	SEARCH_CONFIDENCE_RELATIVE_RATIO,
	type RankedDocResult,
} from './search-results'

function doc(id: string): SearchResult {
	return { id, score: 0 }
}

test('filterFusedResultsByConfidence: empty input', () => {
	expect(
		filterFusedResultsByConfidence({ fusedSorted: [], topK: 10 }),
	).toEqual({ results: [], lowRankingResults: [], noCloseMatches: false })
})

test('filterFusedResultsByConfidence: maxScore below minBestScore', () => {
	const fused = [{ ...doc('a'), score: 0.01 }]
	expect(
		filterFusedResultsByConfidence({
			fusedSorted: fused,
			topK: 10,
			minBestScore: SEARCH_CONFIDENCE_MIN_BEST_SCORE,
		}),
	).toEqual({
		results: [],
		lowRankingResults: [{ ...doc('a'), score: 0.01 }],
		noCloseMatches: true,
	})
})

test('filterFusedResultsByConfidence: drops tail below relative ratio', () => {
	const fused = [
		{ ...doc('strong'), score: 0.04 },
		{ ...doc('weak'), score: 0.015 },
	]
	const threshold = 0.04 * 0.45
	expect(0.015 < threshold).toBe(true)
	expect(
		filterFusedResultsByConfidence({
			fusedSorted: fused,
			topK: 10,
			minBestScore: 0.01,
			relativeRatio: 0.45,
		}),
	).toEqual({
		results: [{ ...doc('strong'), score: 0.04 }],
		lowRankingResults: [{ ...doc('weak'), score: 0.015 }],
		noCloseMatches: false,
	})
})

test('filterFusedResultsByConfidence: top hit always passes relative threshold when above minBest', () => {
	const fused = [
		{ ...doc('a'), score: 0.02 },
		{ ...doc('b'), score: 0.019 },
	]
	expect(
		filterFusedResultsByConfidence({
			fusedSorted: fused,
			topK: 10,
			minBestScore: 0.015,
			relativeRatio: 0.99,
		}),
	).toEqual({
		results: [{ ...doc('a'), score: 0.02 }],
		lowRankingResults: [{ ...doc('b'), score: 0.019 }],
		noCloseMatches: false,
	})
})

test('fuseRankedResultsAll ranks dual-signal doc above single-source', () => {
	const fused = fuseRankedResultsAll({
		semanticResults: [
			{ rank: 0, result: { id: 'a', title: 'A', score: 0 } },
			{ rank: 1, result: { id: 'b', title: 'B', score: 0 } },
		],
		lexicalResults: [
			{ rank: 0, result: { id: 'a', title: 'A', score: 0 } },
			{ rank: 1, result: { id: 'noise', title: 'N', score: 0 } },
		],
	})
	expect(fused[0]?.id).toBe('a')
	expect(filterFusedResultsByConfidence({ fusedSorted: fused, topK: 5 }).noCloseMatches).toBe(
		false,
	)
})
