import { afterEach, expect, test, vi } from 'vitest'

const blogServerMocks = vi.hoisted(() => ({
	addPostRead: vi.fn(),
	applyPostReadToCachedAnalytics: vi.fn(),
	getBlogReadRankings: vi.fn(),
	notifyOfOverallTeamLeaderChange: vi.fn(),
	notifyOfTeamLeaderChangeOnPost: vi.fn(),
}))

vi.mock('#app/utils/blog.server.ts', () => blogServerMocks)

const sessionServerMocks = vi.hoisted(() => ({
	getSession: vi.fn(),
}))

vi.mock('#app/utils/session.server.ts', () => sessionServerMocks)

const clientServerMocks = vi.hoisted(() => ({
	getClientSession: vi.fn(),
}))

vi.mock('#app/utils/client.server.ts', () => clientServerMocks)

// Import after mocks so the action sees the mocked deps.
import { action, markAsRead } from '../mark-as-read.tsx'

function setup({
	user,
}: {
	user: { id: string; team?: 'RED' | 'BLUE' | 'YELLOW' } | null
}) {
	vi.clearAllMocks()
	sessionServerMocks.getSession.mockResolvedValue({
		getUser: async () => user,
	})
	clientServerMocks.getClientSession.mockResolvedValue({
		getClientId: () => 'client-1',
	})
	blogServerMocks.getBlogReadRankings.mockResolvedValue([])
	blogServerMocks.applyPostReadToCachedAnalytics.mockResolvedValue({
		afterPostRankings: [],
		afterOverallRankings: [],
	})
	return {
		request: new Request('http://localhost/action/mark-as-read', {
			method: 'POST',
			body: new URLSearchParams({ slug: 'some-post' }),
		}),
	}
}

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

test('action skips ranking cache updates when the read was a repeat', async () => {
	const { request } = setup({ user: { id: 'user-1', team: 'BLUE' } })
	// addPostRead returns null when this user already read the post this week.
	blogServerMocks.addPostRead.mockResolvedValue(null)

	const response = await action({ request, params: {}, context: {} } as any)

	expect(response.data).toEqual({ success: true })
	expect(blogServerMocks.addPostRead).toHaveBeenCalledOnce()
	expect(blogServerMocks.applyPostReadToCachedAnalytics).not.toHaveBeenCalled()
	const forceFreshCalls = blogServerMocks.getBlogReadRankings.mock.calls.filter(
		([args]) => args.forceFresh,
	)
	expect(forceFreshCalls).toHaveLength(0)
})

test('action increments cached rankings when a new PostRead row was created', async () => {
	const { request } = setup({ user: null })
	blogServerMocks.addPostRead.mockResolvedValue({
		id: 'post-read-1',
		newlyActive: false,
		newReader: true,
	})

	const response = await action({ request, params: {}, context: {} } as any)

	expect(response.data).toEqual({ success: true })
	expect(blogServerMocks.addPostRead).toHaveBeenCalledWith({
		slug: 'some-post',
		clientId: 'client-1',
	})
	expect(blogServerMocks.applyPostReadToCachedAnalytics).toHaveBeenCalledWith({
		request,
		slug: 'some-post',
		team: null,
		newlyActive: false,
		newReader: true,
		beforePostRankings: [],
		beforeOverallRankings: [],
	})
	const forceFreshCalls = blogServerMocks.getBlogReadRankings.mock.calls.filter(
		([args]) => args.forceFresh,
	)
	expect(forceFreshCalls).toHaveLength(0)
})

test('action passes the reader team when incrementing cached rankings', async () => {
	const { request } = setup({ user: { id: 'user-1', team: 'BLUE' } })
	blogServerMocks.addPostRead.mockResolvedValue({
		id: 'post-read-1',
		newlyActive: true,
		newReader: true,
	})

	await action({ request, params: {}, context: {} } as any)

	expect(blogServerMocks.applyPostReadToCachedAnalytics).toHaveBeenCalledWith(
		expect.objectContaining({
			slug: 'some-post',
			team: 'BLUE',
			newlyActive: true,
			newReader: true,
		}),
	)
})

test('markAsRead posts the slug to the mark-as-read action', async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(null, { status: 200 }))
	vi.stubGlobal('fetch', fetchMock)

	const response = await markAsRead({ slug: 'some-post' })

	expect(response?.status).toBe(200)
	expect(fetchMock).toHaveBeenCalledOnce()
	expect(fetchMock.mock.calls[0]?.[0]).toBe('/action/mark-as-read')
	expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
	const body = fetchMock.mock.calls[0]?.[1]?.body
	expect(body).toBeInstanceOf(URLSearchParams)
	expect(String(body)).toBe('slug=some-post')
})

test('markAsRead swallows network TypeErrors so void callers stay quiet', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
	)

	await expect(markAsRead({ slug: 'offline-post' })).resolves.toBeUndefined()
})
