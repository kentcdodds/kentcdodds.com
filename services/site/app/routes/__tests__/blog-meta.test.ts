import { expect, test, vi } from 'vitest'

vi.mock('#app/utils/blog.server.ts', () => ({
	getAllBlogPostReadRankings: vi.fn(),
	getBlogPostReadCounts: vi.fn(),
	getBlogReadRankings: vi.fn(),
	getBlogRecommendations: vi.fn(),
	getReaderCount: vi.fn(),
	getSlugReadsByUser: vi.fn(),
	getTotalPostReads: vi.fn(),
}))

vi.mock('#app/utils/mdx.server.ts', () => ({
	getBlogMdxListItems: vi.fn(),
}))

vi.mock('#app/utils/use-root-data.ts', () => ({
	useRootData: () => ({
		requestInfo: { origin: 'http://localhost', path: '/' },
	}),
}))

import { meta } from '../blog.tsx'

test('blog meta uses fallback copy when loader data is unavailable', () => {
	const metas = meta({
		data: undefined,
		location: {
			pathname: '/blog',
			search: '',
			hash: '',
			state: null,
			key: 'default',
		},
		matches: [
			{
				id: 'root',
				pathname: '/',
				params: {},
				data: {
					requestInfo: {
						origin: 'https://kentcdodds.com',
						path: '/blog',
						userPrefs: { theme: 'light' },
					},
				},
				handle: undefined,
			},
		],
		params: {},
	} as never)

	expect(metas).toContainEqual({
		name: 'description',
		content:
			"Join thousands of people who have read Kent's many articles on JavaScript, TypeScript, React, Testing, Career, and more.",
	})
})
