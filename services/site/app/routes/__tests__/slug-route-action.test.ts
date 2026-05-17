import { expect, test, vi } from 'vitest'

const mdxServerMocks = vi.hoisted(() => ({
	getMdxPage: vi.fn(),
}))

vi.mock('#app/utils/mdx.server', () => mdxServerMocks)
vi.mock('#app/utils/blog.server.ts', () => ({
	getBlogRecommendations: vi.fn(),
}))
vi.mock('#app/utils/not-found-suggestions.server.ts', () => ({
	getNotFoundSuggestions: vi.fn(),
}))
vi.mock('vite-env-only/macros', () => ({
	serverOnly$: (fn: unknown) => fn,
}))

import { action } from '../$slug.tsx'

test('slug action returns 404 for scanner POSTs to unknown page slugs', async () => {
	mdxServerMocks.getMdxPage.mockResolvedValueOnce(null)

	const response = await action({
		request: new Request('http://localhost/session', { method: 'POST' }),
		params: { slug: 'session' },
	} as never)

	expect(response.status).toBe(404)
	expect(await response.text()).toBe('Not found')
	expect(mdxServerMocks.getMdxPage).toHaveBeenCalledWith(
		{ contentDir: 'pages', slug: 'session' },
		{ request: expect.any(Request) },
	)
})

test('slug action returns a normal 405 for unsupported methods to existing pages', async () => {
	mdxServerMocks.getMdxPage.mockResolvedValueOnce({
		code: '',
		frontmatter: {},
	})

	const response = await action({
		request: new Request('http://localhost/about', { method: 'POST' }),
		params: { slug: 'about' },
	} as never)

	expect(response.status).toBe(405)
	expect(response.headers.get('Allow')).toBe('GET, HEAD')
	expect(await response.text()).toBe('Method Not Allowed')
})
