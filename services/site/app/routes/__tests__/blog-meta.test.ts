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

test('blog meta returns loader social metas when available', () => {
	const socialMetas = [
		{ title: 'Kent C. Dodds Blog' },
		{
			name: 'description',
			content:
				"Join thousands of people who have read Kent's many articles on JavaScript, TypeScript, React, Testing, Career, and more.",
		},
	]

	const metas = meta({
		data: { socialMetas },
		location: {
			pathname: '/blog',
			search: '',
			hash: '',
			state: null,
			key: 'default',
		},
		matches: [],
		params: {},
	} as never)

	expect(metas).toEqual(socialMetas)
})

test('blog meta returns empty array when loader data is unavailable', () => {
	const metas = meta({
		data: undefined,
		location: {
			pathname: '/blog',
			search: '',
			hash: '',
			state: null,
			key: 'default',
		},
		matches: [],
		params: {},
	} as never)

	expect(metas).toEqual([])
})
