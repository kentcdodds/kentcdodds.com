// @vitest-environment node
import {
	SEARCH_MAX_QUERY_CHARS,
	SearchQueryTooLongError,
	SearchWorkerTimeoutError,
} from '@kcd-internal/search-shared'
import { expect, test, vi } from 'vitest'

const searchServerMocks = vi.hoisted(() => ({
	searchKCD: vi.fn(),
}))

vi.mock('#app/utils/search.server.ts', () => searchServerMocks)

import { loader } from '../search.ts'

function getDataResult(result: unknown) {
	expect(result).toMatchObject({ type: 'DataWithResponseInit' })
	return result as {
		type: 'DataWithResponseInit'
		data: unknown
		init?: ResponseInit | null
	}
}

function searchRequest(query: string) {
	return new Request(
		`http://localhost/resources/search?query=${encodeURIComponent(query)}`,
		{ headers: { 'X-Forwarded-Host': 'localhost' } },
	)
}

test('loader returns results for a successful search', async () => {
	searchServerMocks.searchKCD.mockReset()
	searchServerMocks.searchKCD.mockResolvedValue({
		results: [
			{
				id: 'blog:react-router',
				score: 0.9,
				type: 'blog',
				title: 'React Router',
				url: '/blog/react-router',
				snippet: 'Routing content',
				summary: 'A summary about React Router',
			},
		],
		lowRankingResults: [],
		noCloseMatches: false,
	})

	const result = getDataResult(
		await loader({
			request: searchRequest('react router'),
		} as any),
	)

	expect(result.init?.status).toBeUndefined()
	expect(result.data).toEqual({
		noCloseMatches: false,
		results: [
			{
				url: 'http://localhost/blog/react-router',
				segment: 'blog',
				title: 'React Router',
				summary: 'A summary about React Router',
				imageUrl: undefined,
				imageAlt: undefined,
			},
		],
	})
})

test('loader degrades gracefully when the search worker times out', async () => {
	searchServerMocks.searchKCD.mockReset()
	searchServerMocks.searchKCD.mockRejectedValue(
		new SearchWorkerTimeoutError(10_000),
	)

	const result = getDataResult(
		await loader({
			request: searchRequest('react router'),
		} as any),
	)

	expect(result.init?.status).toBe(503)
	// A transient outage must never be cached.
	expect(new Headers(result.init?.headers).get('Cache-Control')).toBe(
		'no-store',
	)
	expect(result.data).toEqual({
		error: 'Search is temporarily unavailable. Please try again.',
	})
})

test('loader still returns 400 for overly long queries', async () => {
	searchServerMocks.searchKCD.mockReset()
	searchServerMocks.searchKCD.mockRejectedValue(
		new SearchQueryTooLongError(
			SEARCH_MAX_QUERY_CHARS + 1,
			SEARCH_MAX_QUERY_CHARS,
		),
	)

	const result = getDataResult(
		await loader({
			request: searchRequest('x'.repeat(10)),
		} as any),
	)

	expect(result.init?.status).toBe(400)
	expect(result.data).toEqual({
		error: `Search query too long (${SEARCH_MAX_QUERY_CHARS + 1} chars). Max is ${SEARCH_MAX_QUERY_CHARS}.`,
	})
})
