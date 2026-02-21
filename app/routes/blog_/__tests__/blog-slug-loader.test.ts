import { describe, expect, test, vi, beforeEach } from 'vitest'

const getBlogRecommendations = vi.fn()
const getBlogReadRankings = vi.fn()
const getTotalPostReads = vi.fn()

vi.mock('#app/utils/blog.server.ts', () => ({
	getBlogRecommendations,
	getBlogReadRankings,
	getTotalPostReads,
}))

const getMdxPage = vi.fn()
const getBlogMdxListItems = vi.fn()

vi.mock('#app/utils/mdx.server.ts', () => ({
	getMdxPage,
	getBlogMdxListItems,
}))

// The route module imports this client helper, which otherwise pulls in Prisma.
vi.mock('../../action/mark-as-read.tsx', () => ({
	markAsRead: vi.fn(),
}))

// Import after mocks so the route loader sees the mocked deps.
import { loader } from '../$slug.tsx'

beforeEach(() => {
	vi.clearAllMocks()
})

describe('/blog/:slug loader cache behavior', () => {
	test('does not compute/cachify per-slug stats when post is missing (404)', async () => {
		getMdxPage.mockResolvedValueOnce(null)
		getBlogRecommendations.mockResolvedValueOnce([])

		const request = new Request('http://localhost/blog/does-not-exist')
		const params = { slug: 'does-not-exist' }

		let thrown: unknown
		try {
			await loader({ request, params } as any)
		} catch (e) {
			thrown = e
		}

		expect(thrown).toBeInstanceOf(Response)
		const response = thrown as Response
		expect(response.status).toBe(404)
		expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600')

		const data = await response.json()
		expect(data).toEqual({ recommendations: [] })

		expect(getBlogRecommendations).toHaveBeenCalledTimes(1)
		expect(getBlogReadRankings).not.toHaveBeenCalled()
		expect(getTotalPostReads).not.toHaveBeenCalled()
	})

	test('computes per-slug stats when post exists (200)', async () => {
		getMdxPage.mockResolvedValueOnce({
			code: 'export default function Test() { return null }',
			slug: 'my-post',
			editLink: 'https://example.com/edit',
			frontmatter: { title: 'My Post', categories: ['react'], meta: {} },
		})
		getBlogRecommendations.mockResolvedValueOnce([])
		getBlogReadRankings.mockResolvedValueOnce([])
		getTotalPostReads.mockResolvedValueOnce(0)

		const request = new Request('http://localhost/blog/my-post')
		const params = { slug: 'my-post' }

		const response = (await loader({ request, params } as any)) as Response
		expect(response.status).toBe(200)

		const data = await response.json()
		expect(data).toMatchObject({
			page: { slug: 'my-post' },
			recommendations: [],
			readRankings: [],
			totalReads: '0',
			leadingTeam: null,
		})

		expect(getBlogRecommendations).toHaveBeenCalledTimes(1)
		expect(getBlogReadRankings).toHaveBeenCalledTimes(1)
		expect(getTotalPostReads).toHaveBeenCalledTimes(1)
	})
})

