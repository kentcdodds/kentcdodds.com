import { expect, test, vi } from 'vitest'
import { queryLexicalSearch } from './search-db'

function createDb({
	onAll,
}: {
	onAll: (
		candidateQuery: string,
		topK: number,
	) => Promise<{ results?: Array<Record<string, unknown>> }>
}) {
	const boundQueries: Array<{ candidateQuery: string; topK: number }> = []

	const db = {
		prepare: vi.fn(() => ({
			bind: vi.fn((candidateQuery: string, topK: number) => ({
				all: vi.fn(async () => {
					boundQueries.push({ candidateQuery, topK })
					return await onAll(candidateQuery, topK)
				}),
			})),
		})),
	} as unknown as D1Database

	return { db, boundQueries }
}

test('queryLexicalSearch quotes hyphenated date tokens for FTS', async () => {
	const { db, boundQueries } = createDb({
		onAll: async () => ({
			results: [
				{
					id: 'youtube:office-hours:chunk:0',
					type: 'youtube',
					slug: 'office-hours',
					title: 'KCD Office Hours',
					url: '/youtube?video=office-hours',
					snippet: 'Office hours recording',
					startSeconds: 17,
				},
			],
		}),
	})

	const results = await queryLexicalSearch({
		db,
		query: 'KCD Office Hours 2025-04-17',
		topK: 5,
	})

	expect(boundQueries).toEqual([
		{
			candidateQuery: 'KCD OR Office OR Hours OR "2025-04-17"',
			topK: 5,
		},
	])
	expect(results).toEqual([
		{
			id: 'youtube:office-hours:chunk:0',
			type: 'youtube',
			slug: 'office-hours',
			title: 'KCD Office Hours',
			url: '/youtube?video=office-hours',
			snippet: 'Office hours recording',
			chunkIndex: undefined,
			chunkCount: undefined,
			startSeconds: 17,
			endSeconds: undefined,
			imageUrl: undefined,
			imageAlt: undefined,
		},
	])
})

test('queryLexicalSearch retries when D1 reports no such column', async () => {
	const { db, boundQueries } = createDb({
		onAll: async () => {
			if (boundQueries.length === 1) {
				throw new Error('D1_ERROR: no such column: 04: SQLITE_ERROR')
			}
			return { results: [] }
		},
	})

	const results = await queryLexicalSearch({
		db,
		query: 'KCD Office Hours 2025-04-17',
		topK: 5,
	})

	expect(results).toEqual([])
	expect(boundQueries).toEqual([
		{
			candidateQuery: 'KCD OR Office OR Hours OR "2025-04-17"',
			topK: 5,
		},
		{
			candidateQuery: 'KCD OR Office OR Hours OR "2025-04-17"',
			topK: 5,
		},
	])
})

test('queryLexicalSearch quotes uppercase OR tokens', async () => {
	const { db, boundQueries } = createDb({
		onAll: async () => ({
			results: [
				{
					id: 'blog:or-token:chunk:0',
					type: 'blog',
					slug: 'or-token',
					title: 'Literal OR token',
					url: '/blog/or-token',
					snippet: 'Contains the word OR as content',
				},
			],
		}),
	})

	const results = await queryLexicalSearch({
		db,
		query: 'OR',
		topK: 5,
	})

	expect(boundQueries).toEqual([
		{
			candidateQuery: '"OR"',
			topK: 5,
		},
	])
	expect(results[0]?.id).toBe('blog:or-token:chunk:0')
})

test('queryLexicalSearch quotes uppercase NEAR tokens', async () => {
	const { db, boundQueries } = createDb({
		onAll: async () => ({
			results: [
				{
					id: 'blog:near-token:chunk:0',
					type: 'blog',
					slug: 'near-token',
					title: 'Literal NEAR token',
					url: '/blog/near-token',
					snippet: 'Contains the word NEAR as content',
				},
			],
		}),
	})

	const results = await queryLexicalSearch({
		db,
		query: 'NEAR',
		topK: 5,
	})

	expect(boundQueries).toEqual([
		{
			candidateQuery: '"NEAR"',
			topK: 5,
		},
	])
	expect(results[0]?.id).toBe('blog:near-token:chunk:0')
})
