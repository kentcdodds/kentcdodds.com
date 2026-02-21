import { beforeEach, describe, expect, test, vi } from 'vitest'

const blogServerMocks = vi.hoisted(() => ({
	getBlogRecommendations: vi.fn(),
	getBlogReadRankings: vi.fn(),
	getTotalPostReads: vi.fn(),
}))

vi.mock('#app/utils/blog.server.ts', () => blogServerMocks)

const mdxServerMocks = vi.hoisted(() => ({
	getMdxPage: vi.fn(),
	getBlogMdxListItems: vi.fn(),
}))

vi.mock('#app/utils/mdx.server.ts', () => mdxServerMocks)

// The route module imports this client helper, which otherwise pulls in Prisma.
vi.mock('../../action/mark-as-read.tsx', () => ({
	markAsRead: vi.fn(),
}))

// The route module imports this hook, which pulls in `root.tsx` and server auth/db code.
// We only exercise the loader, so a lightweight mock keeps this test hermetic.
vi.mock('#app/utils/use-root-data.ts', () => ({
	useRootData: () => ({ requestInfo: { origin: 'http://localhost' } }),
}))

// In Vitest, the Vite macro plugin isn't installed, so mock the macro helper.
vi.mock('vite-env-only/macros', () => ({
	serverOnly$: (fn: unknown) => fn,
}))

// Import after mocks so the route loader sees the mocked deps.
import { loader } from '../$slug.tsx'

beforeEach(() => {
	vi.clearAllMocks()
})

describe('/blog/:slug loader cache behavior', () => {
	test('does not compute/cachify per-slug stats when post is missing (404)', async () => {
		mdxServerMocks.getMdxPage.mockResolvedValueOnce(null)
		blogServerMocks.getBlogRecommendations.mockResolvedValueOnce([])

		const request = new Request('http://localhost/blog/does-not-exist')
		const params = { slug: 'does-not-exist' }

		await expect(loader({ request, params } as any)).rejects.toMatchObject({
			type: 'DataWithResponseInit',
			data: { recommendations: [] },
			init: {
				status: 404,
				headers: { 'Cache-Control': 'private, max-age=60' },
			},
		})

		expect(blogServerMocks.getBlogRecommendations).toHaveBeenCalledTimes(1)
		expect(blogServerMocks.getBlogRecommendations).toHaveBeenCalledWith(
			expect.objectContaining({
				keywords: [],
				exclude: ['does-not-exist'],
			}),
		)
		expect(blogServerMocks.getBlogReadRankings).not.toHaveBeenCalled()
		expect(blogServerMocks.getTotalPostReads).not.toHaveBeenCalled()
	})

	test('computes per-slug stats when post exists (200)', async () => {
		mdxServerMocks.getMdxPage.mockResolvedValueOnce({
			code: 'export default function Test() { return null }',
			slug: 'my-post',
			editLink: 'https://example.com/edit',
			frontmatter: { title: 'My Post', categories: ['react'], meta: {} },
		})
		blogServerMocks.getBlogRecommendations.mockResolvedValueOnce([])
		blogServerMocks.getBlogReadRankings.mockResolvedValueOnce([])
		blogServerMocks.getTotalPostReads.mockResolvedValueOnce(0)

		const request = new Request('http://localhost/blog/my-post')
		const params = { slug: 'my-post' }

		const result = (await loader({ request, params } as any)) as any
		expect(result).toMatchObject({
			type: 'DataWithResponseInit',
			init: {
				status: 200,
				headers: { 'Cache-Control': 'private, max-age=3600' },
			},
		})
		expect(result.data).toMatchObject({
			page: { slug: 'my-post' },
			recommendations: [],
			readRankings: [],
			totalReads: '0',
			leadingTeam: null,
		})

		expect(blogServerMocks.getBlogRecommendations).toHaveBeenCalledTimes(1)
		expect(blogServerMocks.getBlogRecommendations).toHaveBeenCalledWith(
			expect.objectContaining({ keywords: ['react'] }),
		)
		expect(blogServerMocks.getBlogReadRankings).toHaveBeenCalledTimes(1)
		expect(blogServerMocks.getTotalPostReads).toHaveBeenCalledTimes(1)
	})
})

