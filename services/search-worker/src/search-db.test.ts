import { expect, test, vi } from 'vitest'
import { type LexicalSearchArtifact } from '@kcd-internal/search-shared'
import { queryLexicalSearch, replaceSearchSource } from './search-db'

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

type BoundStatement = {
	sql: string
	values: Array<unknown>
}

function createBatchDb() {
	const boundStatements: Array<BoundStatement> = []
	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((...values: Array<unknown>) => ({ sql, values })),
		})),
		batch: vi.fn(async (statements: Array<D1PreparedStatement>) => {
			boundStatements.push(...(statements as unknown as Array<BoundStatement>))
			return []
		}),
	} as unknown as D1Database

	return { db, boundStatements }
}

test('replaceSearchSource scopes duplicate chunk storage ids by source', async () => {
	const { db, boundStatements } = createBatchDb()
	const artifact: LexicalSearchArtifact = {
		version: 1,
		generatedAt: '2026-05-27T00:00:00.000Z',
		chunks: [
			{
				id: 'youtube:abc123def45:chunk:0',
				type: 'youtube',
				slug: 'abc123def45',
				url: '/youtube?video=abc123def45',
				title: 'Duplicate Test Video',
				snippet: 'First duplicate chunk.',
				text: 'first chunk text',
				chunkIndex: 0,
				chunkCount: 2,
			},
			{
				id: 'youtube:abc123def45:chunk:0',
				type: 'youtube',
				slug: 'abc123def45',
				url: '/youtube?video=abc123def45',
				title: 'Duplicate Test Video',
				snippet: 'Second duplicate chunk.',
				text: 'second chunk text',
				chunkIndex: 1,
				chunkCount: 2,
			},
		],
	}

	await replaceSearchSource({
		db,
		sourceKey: 'lexical-search/repo-content.json',
		artifact,
		syncedAt: '2026-05-27T01:00:00.000Z',
	})
	await replaceSearchSource({
		db,
		sourceKey: 'lexical-search/youtube.json',
		artifact,
		syncedAt: '2026-05-27T01:00:00.000Z',
	})

	const chunkInsertStatements = boundStatements.filter((statement) =>
		statement.sql.includes('INSERT INTO lexical_chunks'),
	)
	const chunkStorageIds = chunkInsertStatements.map((statement) =>
		String(statement.values[0]),
	)
	expect(chunkStorageIds).toEqual([
		JSON.stringify([
			'chunk',
			'lexical-search/repo-content.json',
			'youtube:abc123def45:chunk:0',
			0,
		]),
		JSON.stringify([
			'chunk',
			'lexical-search/repo-content.json',
			'youtube:abc123def45:chunk:0',
			1,
		]),
		JSON.stringify([
			'chunk',
			'lexical-search/youtube.json',
			'youtube:abc123def45:chunk:0',
			0,
		]),
		JSON.stringify([
			'chunk',
			'lexical-search/youtube.json',
			'youtube:abc123def45:chunk:0',
			1,
		]),
	])
	expect(new Set(chunkStorageIds).size).toBe(chunkStorageIds.length)

	const docInsertStatements = boundStatements.filter((statement) =>
		statement.sql.includes('INSERT INTO lexical_docs'),
	)
	expect(docInsertStatements.map((statement) => statement.values[0])).toEqual([
		JSON.stringify([
			'doc',
			'lexical-search/repo-content.json',
			'youtube:abc123def45',
		]),
		JSON.stringify([
			'doc',
			'lexical-search/youtube.json',
			'youtube:abc123def45',
		]),
	])
	expect(docInsertStatements.map((statement) => statement.values[7])).toEqual([
		2, 2,
	])
})

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

test('queryLexicalSearch returns original chunk ids from storage ids', async () => {
	const { db } = createDb({
		onAll: async () => ({
			results: [
				{
					id: JSON.stringify([
						'chunk',
						'lexical-search/repo-content.json',
						'blog:doc-without-slug:chunk:0',
						0,
					]),
					type: 'blog',
					title: 'Doc Without Slug',
					url: '/blog/doc-without-slug',
					snippet: 'A lexical result with a storage ID.',
				},
			],
		}),
	})

	const results = await queryLexicalSearch({
		db,
		query: 'doc',
		topK: 5,
	})

	expect(results[0]?.id).toBe('blog:doc-without-slug:chunk:0')
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
