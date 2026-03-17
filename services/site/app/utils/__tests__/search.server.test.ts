import { expect, test, vi } from 'vitest'
import {
	SEARCH_MAX_QUERY_CHARS,
	SearchQueryTooLongError,
	type SearchResult,
} from '@kcd-internal/search-shared'
import { setEnv } from '#tests/env-disposable.ts'

const {
	querySearchWorkerResultsMock,
	getSemanticSearchPresentationMock,
	getLatestCachifiedKey,
	setLatestCachifiedKey,
} = vi.hoisted(() => {
	let latestCachifiedKey: string | null = null
	return {
		querySearchWorkerResultsMock: vi.fn<
			(args: { query: string; topK: number }) => Promise<Array<SearchResult>>
		>(async () => []),
		getSemanticSearchPresentationMock: vi.fn(async () => ({})),
		getLatestCachifiedKey: () => latestCachifiedKey,
		setLatestCachifiedKey: (key: string | null) => {
			latestCachifiedKey = key
		},
	}
})

vi.mock('#app/utils/cache.server.ts', () => ({
	cache: {
		name: 'test-cache',
		get: () => null,
		set: async () => {},
		delete: async () => {},
	},
	cachified: async ({
		key,
		getFreshValue,
	}: {
		key: string
		getFreshValue: () => Promise<unknown>
	}) => {
		setLatestCachifiedKey(key)
		return await getFreshValue()
	},
}))

vi.mock('#app/utils/search-worker-client.server.ts', () => ({
	querySearchWorkerResults: querySearchWorkerResultsMock,
}))

vi.mock('#app/utils/semantic-search-presentation.server.ts', () => ({
	getSemanticSearchPresentation: getSemanticSearchPresentationMock,
}))

import { searchKCD } from '../search.server.ts'

test('searchKCD normalizes queries before calling the worker', async () => {
	querySearchWorkerResultsMock.mockReset()
	getSemanticSearchPresentationMock.mockReset()
	setLatestCachifiedKey(null)
	querySearchWorkerResultsMock.mockResolvedValue([
		{
			id: 'blog:react-router',
			score: 0.9,
			type: 'blog',
			title: 'React Router',
			url: '/blog/react-router',
			snippet: 'Routing content',
		},
	])
	getSemanticSearchPresentationMock.mockResolvedValue({})
	using _ignoredEnv = setEnv({
		SEARCH_WORKER_URL: 'https://search-worker.example',
	})

	await searchKCD({
		query: '  React   Router  ',
		topK: 5,
	})

	expect(querySearchWorkerResultsMock).toHaveBeenCalledWith({
		query: 'React Router',
		topK: 5,
	})
	expect(getLatestCachifiedKey()).toContain('search:kcd:v1:')
})

test('searchKCD enriches worker results with presentation data', async () => {
	querySearchWorkerResultsMock.mockReset()
	getSemanticSearchPresentationMock.mockReset()
	querySearchWorkerResultsMock.mockResolvedValue([
		{
			id: 'blog:react-router',
			score: 0.9,
			type: 'blog',
			title: 'React Router',
			url: '/blog/react-router',
			snippet: 'Routing content',
		},
	])
	getSemanticSearchPresentationMock.mockResolvedValue({
		summary: 'Presentation summary',
		imageUrl: '/image.png',
		imageAlt: 'Image alt',
	})

	const results = await searchKCD({
		query: 'react router',
		topK: 5,
	})

	expect(results).toEqual([
		{
			id: 'blog:react-router',
			score: 0.9,
			type: 'blog',
			title: 'React Router',
			url: '/blog/react-router',
			snippet: 'Routing content',
			summary: 'Presentation summary',
			imageUrl: '/image.png',
			imageAlt: 'Image alt',
		},
	])
})

test('searchKCD rejects overly long queries before calling the worker', async () => {
	querySearchWorkerResultsMock.mockReset()

	await expect(
		searchKCD({
			query: 'x'.repeat(SEARCH_MAX_QUERY_CHARS + 1),
			topK: 5,
		}),
	).rejects.toBeInstanceOf(SearchQueryTooLongError)
	expect(querySearchWorkerResultsMock).not.toHaveBeenCalled()
})
