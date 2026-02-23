import { describe, expect, test, vi } from 'vitest'

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

const sessionServerMocks = vi.hoisted(() => ({
	getUser: vi.fn(),
}))

// The route module imports server DB/session helpers; mock them to avoid
// requiring DATABASE_URL and an actual SQLite DB in unit tests.
vi.mock('#app/utils/session.server.ts', () => sessionServerMocks)

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		favorite: {
			findUnique: vi.fn().mockResolvedValue(null),
		},
	},
}))

// The route module imports this component, but tests only exercise the loader.
vi.mock('#app/routes/resources/favorite.tsx', () => ({
	FavoriteToggle: () => null,
}))

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

function setup() {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue(null)
}

describe('/blog/:slug loader cache behavior', () => {
	test('rejects invalid slugs (400) before doing any work', async () => {
		setup()

		const request = new Request('http://localhost/blog/../etc')
		const params = { slug: '../etc' }

		await expect(loader({ request, params } as any)).rejects.toMatchObject({
			status: 400,
		})

		expect(mdxServerMocks.getMdxPage).not.toHaveBeenCalled()
		expect(sessionServerMocks.getUser).not.toHaveBeenCalled()
		expect(blogServerMocks.getBlogRecommendations).not.toHaveBeenCalled()
		expect(blogServerMocks.getBlogReadRankings).not.toHaveBeenCalled()
		expect(blogServerMocks.getTotalPostReads).not.toHaveBeenCalled()
	})

	test('does not compute/cachify per-slug stats when post is missing (404)', async () => {
		setup()

		mdxServerMocks.getMdxPage.mockResolvedValueOnce(null)
		blogServerMocks.getBlogRecommendations.mockResolvedValueOnce([])

		const request = new Request('http://localhost/blog/does-not-exist')
		const params = { slug: 'does-not-exist' }

		// When calling a loader directly, react-router's `data()` helper throws a
		// `DataWithResponseInit` object (not a `Response`). This assertion matches
		// that shape as returned by react-router v7.
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
		expect(sessionServerMocks.getUser).not.toHaveBeenCalled()
		expect(blogServerMocks.getBlogReadRankings).not.toHaveBeenCalled()
		expect(blogServerMocks.getTotalPostReads).not.toHaveBeenCalled()
	})

	test('computes per-slug stats when post exists (200)', async () => {
		setup()

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
		expect(sessionServerMocks.getUser).toHaveBeenCalledTimes(1)
		expect(blogServerMocks.getBlogReadRankings).toHaveBeenCalledTimes(1)
		expect(blogServerMocks.getTotalPostReads).toHaveBeenCalledTimes(1)
	})
})
