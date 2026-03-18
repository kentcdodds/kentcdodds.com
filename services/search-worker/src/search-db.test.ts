import { expect, test, vi } from 'vitest'
import {
	buildLexicalSearchMatchQuery,
	queryLexicalSearch,
} from './search-db.ts'

test('buildLexicalSearchMatchQuery skips standalone hyphens and quotes hyphenated tokens', () => {
	const matchQuery = buildLexicalSearchMatchQuery(
		'📙 Question about testing alongside RTL - Title: react-router URL: /questions/testing-alongside-rtl',
	)

	expect(matchQuery).toBe(
		'Question OR about OR testing OR alongside OR RTL OR Title OR "react-router" OR URL OR questions OR "testing-alongside-rtl"',
	)
	expect(matchQuery).not.toContain(' OR - OR ')
})

test('queryLexicalSearch retries on no such column with a sanitized fallback query', async () => {
	const boundQueries: Array<{ candidateQuery: string; topK: number }> = []
	const all = vi
		.fn()
		.mockRejectedValueOnce(new Error('no such column: about'))
		.mockResolvedValueOnce({ results: [] })

	const db = {
		prepare: vi.fn(() => ({
			bind: (candidateQuery: string, topK: number) => {
				boundQueries.push({ candidateQuery, topK })
				return { all }
			},
		})),
	} as unknown as D1Database

	const results = await queryLexicalSearch({
		db,
		query: 'react-router',
		topK: 5,
	})

	expect(results).toEqual([])
	expect(boundQueries).toEqual([
		{ candidateQuery: '"react-router"', topK: 5 },
		{ candidateQuery: '"react-router"', topK: 5 },
	])
})
