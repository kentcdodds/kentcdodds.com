// @vitest-environment node
import { expect, test, vi } from 'vitest'

const sessionServerMocks = vi.hoisted(() => ({
	getUser: vi.fn(),
}))

const litefsServerMocks = vi.hoisted(() => ({
	ensurePrimary: vi.fn(),
	getInstanceInfoSync: vi.fn().mockReturnValue({ currentIsPrimary: true }),
}))

const blogServerMocks = vi.hoisted(() => ({
	getPodcastListenRankings: vi.fn(),
	getTotalPodcastEpisodeListens: vi.fn(),
}))

const prismaServerMocks = vi.hoisted(() => ({
	getEpisodePodcastListens: vi.fn(),
	setEpisodePodcastListen: vi.fn(),
}))

vi.mock('#app/utils/session.server.ts', () => sessionServerMocks)
vi.mock('#app/utils/litefs-js.server.ts', () => litefsServerMocks)
vi.mock('#app/utils/prisma.server.ts', () => prismaServerMocks)
vi.mock('#app/utils/blog.server.ts', () => ({
	getPodcastListenRankings: blogServerMocks.getPodcastListenRankings,
	getTotalPodcastEpisodeListens: blogServerMocks.getTotalPodcastEpisodeListens,
}))
vi.mock('vite-env-only/macros', () => ({
	serverOnly$: (fn: unknown) => fn,
}))

import { action, loader } from '../podcast-listen.tsx'

test('loader returns listen status for authenticated user', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue({ id: 'user-1' })
	prismaServerMocks.getEpisodePodcastListens.mockResolvedValue(new Set(['7:12']))

	const request = new Request(
		'http://localhost/resources/podcast-listen?contentId=7:12',
	)
	const result = (await loader({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ listened: true, authenticated: true })
	expect(prismaServerMocks.getEpisodePodcastListens).toHaveBeenCalledWith({
		userId: 'user-1',
	})
})

test('loader returns unauthenticated status for anonymous user', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue(null)

	const request = new Request(
		'http://localhost/resources/podcast-listen?contentId=7:12',
	)
	const result = (await loader({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ listened: false, authenticated: false })
	expect(prismaServerMocks.getEpisodePodcastListens).not.toHaveBeenCalled()
})

test('action validates content ids', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue({ id: 'user-1' })

	const formData = new FormData()
	formData.set('contentId', 'bad-id')
	formData.set('listened', 'true')

	const request = new Request('http://localhost/resources/podcast-listen', {
		method: 'POST',
		body: formData,
	})
	const result = (await action({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(400)
	expect(result.data).toEqual({
		listened: false,
		authenticated: false,
		error: 'INVALID_CONTENT_ID',
	})
	expect(litefsServerMocks.ensurePrimary).not.toHaveBeenCalled()
	expect(prismaServerMocks.setEpisodePodcastListen).not.toHaveBeenCalled()
})

test('action requires login', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue(null)

	const formData = new FormData()
	formData.set('contentId', '7:12')
	formData.set('listened', 'true')

	const request = new Request('http://localhost/resources/podcast-listen', {
		method: 'POST',
		body: formData,
	})
	const result = (await action({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(401)
	expect(result.data).toEqual({
		listened: false,
		authenticated: false,
		error: 'LOGIN_REQUIRED',
	})
	expect(litefsServerMocks.ensurePrimary).not.toHaveBeenCalled()
})

test('action stores listen for authenticated user', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue({ id: 'user-1' })
	blogServerMocks.getPodcastListenRankings
		.mockResolvedValueOnce([{ team: 'BLUE', ranking: 1, totalCount: 1, percent: 1 }])
		.mockResolvedValueOnce([{ team: 'BLUE', ranking: 1, totalCount: 1, percent: 1 }])
		.mockResolvedValueOnce([{ team: 'BLUE', ranking: 1, totalCount: 1, percent: 1 }])
		.mockResolvedValueOnce([{ team: 'BLUE', ranking: 1, totalCount: 1, percent: 1 }])
	blogServerMocks.getTotalPodcastEpisodeListens.mockResolvedValue(1)
	prismaServerMocks.setEpisodePodcastListen.mockResolvedValue(true)

	const formData = new FormData()
	formData.set('contentId', '7:12')
	formData.set('listened', 'true')

	const request = new Request('http://localhost/resources/podcast-listen', {
		method: 'POST',
		body: formData,
	})
	const result = (await action({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ listened: true, authenticated: true })
	expect(litefsServerMocks.ensurePrimary).toHaveBeenCalledTimes(1)
	expect(prismaServerMocks.setEpisodePodcastListen).toHaveBeenCalledWith({
		seasonNumber: 7,
		episodeNumber: 12,
		userId: 'user-1',
		listened: true,
	})
})

test('action removes listen for authenticated user', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue({ id: 'user-1' })
	blogServerMocks.getPodcastListenRankings
		.mockResolvedValueOnce([{ team: 'BLUE', ranking: 1, totalCount: 1, percent: 1 }])
		.mockResolvedValueOnce([{ team: 'BLUE', ranking: 1, totalCount: 1, percent: 1 }])
	prismaServerMocks.setEpisodePodcastListen.mockResolvedValue(false)

	const formData = new FormData()
	formData.set('contentId', '7:12')
	formData.set('listened', 'false')

	const request = new Request('http://localhost/resources/podcast-listen', {
		method: 'POST',
		body: formData,
	})
	const result = (await action({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ listened: false, authenticated: true })
	expect(litefsServerMocks.ensurePrimary).toHaveBeenCalledTimes(1)
	expect(prismaServerMocks.setEpisodePodcastListen).toHaveBeenCalledWith({
		seasonNumber: 7,
		episodeNumber: 12,
		userId: 'user-1',
		listened: false,
	})
})
