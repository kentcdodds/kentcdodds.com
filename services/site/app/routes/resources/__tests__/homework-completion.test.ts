// @vitest-environment node
import { expect, test, vi } from 'vitest'

const sessionServerMocks = vi.hoisted(() => ({
	getUser: vi.fn(),
}))

const clientServerMocks = vi.hoisted(() => ({
	getClientSession: vi.fn(),
}))

const litefsServerMocks = vi.hoisted(() => ({
	ensurePrimary: vi.fn(),
}))

const prismaServerMocks = vi.hoisted(() => ({
	getEpisodeHomeworkCompletions: vi.fn(),
	setEpisodeHomeworkCompletion: vi.fn(),
}))

vi.mock('#app/utils/session.server.ts', () => sessionServerMocks)
vi.mock('#app/utils/client.server.ts', () => clientServerMocks)
vi.mock('#app/utils/litefs-js.server.ts', () => litefsServerMocks)
vi.mock('#app/utils/prisma.server.ts', () => prismaServerMocks)

import { action, loader } from '../homework-completion.tsx'

test('loader returns completion status for authenticated user', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue({ id: 'user-1' })
	clientServerMocks.getClientSession.mockResolvedValue({
		getClientId: vi.fn().mockReturnValue('client-1'),
		getHeaders: vi.fn().mockResolvedValue(new Headers()),
	})
	prismaServerMocks.getEpisodeHomeworkCompletions.mockResolvedValue(
		new Set(['7:12:1']),
	)

	const request = new Request(
		'http://localhost/resources/homework-completion?contentId=7:12:1',
	)
	const result = (await loader({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ completed: true, authenticated: true })
	expect(prismaServerMocks.getEpisodeHomeworkCompletions).toHaveBeenCalledWith({
		seasonNumber: 7,
		episodeNumber: 12,
		userId: 'user-1',
	})
})

test('loader falls back to client session for anonymous user', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue(null)
	clientServerMocks.getClientSession.mockResolvedValue({
		getClientId: vi.fn().mockReturnValue('client-1'),
		getHeaders: vi.fn().mockResolvedValue(new Headers()),
	})
	prismaServerMocks.getEpisodeHomeworkCompletions.mockResolvedValue(new Set())

	const request = new Request(
		'http://localhost/resources/homework-completion?contentId=7:12:1',
	)
	const result = (await loader({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ completed: false, authenticated: false })
	expect(prismaServerMocks.getEpisodeHomeworkCompletions).toHaveBeenCalledWith({
		seasonNumber: 7,
		episodeNumber: 12,
		clientId: 'client-1',
	})
})

test('action validates content ids', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue(null)
	clientServerMocks.getClientSession.mockResolvedValue({
		getClientId: vi.fn().mockReturnValue('client-1'),
		getHeaders: vi.fn().mockResolvedValue(new Headers()),
	})

	const formData = new FormData()
	formData.set('contentId', 'bad-id')
	formData.set('completed', 'true')

	const request = new Request('http://localhost/resources/homework-completion', {
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
		completed: false,
		authenticated: false,
		error: 'INVALID_CONTENT_ID',
	})
	expect(litefsServerMocks.ensurePrimary).not.toHaveBeenCalled()
	expect(prismaServerMocks.setEpisodeHomeworkCompletion).not.toHaveBeenCalled()
})

test('action stores completion for anonymous client', async () => {
	vi.clearAllMocks()
	sessionServerMocks.getUser.mockResolvedValue(null)
	clientServerMocks.getClientSession.mockResolvedValue({
		getClientId: vi.fn().mockReturnValue('client-1'),
		getHeaders: vi.fn().mockResolvedValue(new Headers()),
	})
	prismaServerMocks.setEpisodeHomeworkCompletion.mockResolvedValue(true)

	const formData = new FormData()
	formData.set('contentId', '7:12:1')
	formData.set('completed', 'true')

	const request = new Request('http://localhost/resources/homework-completion', {
		method: 'POST',
		body: formData,
	})
	const result = (await action({ request } as any)) as {
		type?: string
		data?: unknown
		init?: ResponseInit | null
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ completed: true, authenticated: false })
	expect(litefsServerMocks.ensurePrimary).toHaveBeenCalledTimes(1)
	expect(prismaServerMocks.setEpisodeHomeworkCompletion).toHaveBeenCalledWith({
		seasonNumber: 7,
		episodeNumber: 12,
		itemIndex: 1,
		clientId: 'client-1',
		completed: true,
	})
})
