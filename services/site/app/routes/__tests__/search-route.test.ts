// @vitest-environment node
import {
	SEARCH_MAX_QUERY_CHARS,
	SearchWorkerTimeoutError,
} from '@kcd-internal/search-shared'
import { expect, test, vi } from 'vitest'

const searchServerMocks = vi.hoisted(() => ({
	searchKCD: vi.fn(),
}))

vi.mock('#app/utils/search.server.ts', () => searchServerMocks)

import { loader } from '../search.tsx'

function getDataResult(result: unknown) {
	expect(result).toMatchObject({ type: 'DataWithResponseInit' })
	return result as {
		type: 'DataWithResponseInit'
		data: {
			q: string
			error?: string
			searchPayload: Promise<{
				results: Array<unknown>
				lowRankingResults: Array<unknown>
				noCloseMatches: boolean
				error?: string
			}>
		}
		init?: ResponseInit | null
	}
}

function searchPageRequest(query: string) {
	return new Request(
		`http://localhost/search?q=${encodeURIComponent(query)}`,
	)
}

test('loader returns deferred search results', async () => {
	searchServerMocks.searchKCD.mockReset()
	searchServerMocks.searchKCD.mockResolvedValue({
		results: [
			{
				id: 'blog:react-router',
				score: 0.9,
				type: 'blog',
				title: 'React Router',
				url: '/blog/react-router',
			},
		],
		lowRankingResults: [],
		noCloseMatches: false,
	})

	const result = getDataResult(
		await loader({
			request: searchPageRequest('react router'),
		} as any),
	)

	expect(result.data.q).toBe('react router')
	expect(result.data.error).toBeUndefined()
	await expect(result.data.searchPayload).resolves.toMatchObject({
		results: [{ id: 'blog:react-router' }],
		lowRankingResults: [],
		noCloseMatches: false,
		error: undefined,
	})
})

test('loader soft-degrades search worker timeouts instead of rejecting', async () => {
	searchServerMocks.searchKCD.mockReset()
	searchServerMocks.searchKCD.mockRejectedValue(
		new SearchWorkerTimeoutError(10_000),
	)

	const result = getDataResult(
		await loader({
			request: searchPageRequest('microfrontend'),
		} as any),
	)

	expect(new Headers(result.init?.headers).get('Cache-Control')).toBe(
		'no-store',
	)
	await expect(result.data.searchPayload).resolves.toEqual({
		results: [],
		lowRankingResults: [],
		noCloseMatches: false,
		error: 'Search is temporarily unavailable. Please try again.',
	})
})

test('loader still surfaces query-too-long without calling search', async () => {
	searchServerMocks.searchKCD.mockReset()
	const tooLong = 'x'.repeat(SEARCH_MAX_QUERY_CHARS + 1)

	const result = getDataResult(
		await loader({
			request: searchPageRequest(tooLong),
		} as any),
	)

	expect(searchServerMocks.searchKCD).not.toHaveBeenCalled()
	expect(result.data.error).toContain('Query too long')
	await expect(result.data.searchPayload).resolves.toEqual({
		results: [],
		lowRankingResults: [],
		noCloseMatches: false,
	})
})
