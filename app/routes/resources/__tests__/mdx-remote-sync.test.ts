import { expect, test, vi } from 'vitest'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'

const { cacheDeleteMock, getEnvMock } = vi.hoisted(() => ({
	cacheDeleteMock: vi.fn(async (_key: string) => true),
	getEnvMock: vi.fn(() => ({ INTERNAL_COMMAND_TOKEN: 'test-internal-token' })),
}))

vi.mock('#app/utils/cache.server.ts', () => ({
	cache: {
		delete: cacheDeleteMock,
	},
}))

vi.mock('#app/utils/env.server.ts', () => ({
	getEnv: () => getEnvMock(),
}))

import { action } from '../mdx-remote-sync.ts'

function buildRequest({
	authorization,
	body,
}: {
	authorization: string
	body: unknown
}) {
	return new Request('https://kentcdodds.com/resources/mdx-remote-sync', {
		method: 'POST',
		headers: {
			authorization,
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	})
}

test('returns 401 for invalid auth token', async () => {
	const response = (await action({
		request: buildRequest({
			authorization: 'Bearer invalid',
			body: { upserts: [], deletes: [] },
		}),
	} as never)) as { status?: number; init?: { status?: number } }

	expect(response.status ?? response.init?.status).toBe(401)
})

test('syncs artifact upserts/deletes into MDX_REMOTE_KV and invalidates caches', async () => {
	const putMock = vi.fn(async () => {})
	const deleteMock = vi.fn(async () => {})
	cacheDeleteMock.mockClear()
	setRuntimeBindingSource({
		MDX_REMOTE_KV: {
			put: putMock,
			delete: deleteMock,
		},
	})

	try {
		const response = (await action({
			request: buildRequest({
				authorization: 'Bearer test-internal-token',
				body: {
					upserts: [
						{ key: 'blog/new-post.json', value: '{"slug":"new-post"}' },
						{ key: 'manifest.json', value: '{"entries":[]}' },
					],
					deletes: ['pages/old-page.json'],
				},
			}),
		} as never)) as { status?: number; init?: { status?: number } }

		expect(response.status ?? response.init?.status).toBe(200)
		expect(putMock).toHaveBeenCalledTimes(2)
		expect(deleteMock).toHaveBeenCalledWith('pages/old-page.json')
		expect(cacheDeleteMock).toHaveBeenCalled()
		const deletedCacheKeys = cacheDeleteMock.mock.calls.map((call) => call[0])
		expect(deletedCacheKeys).toContain('blog:new-post:compiled:remote')
		expect(deletedCacheKeys).toContain('mdx-page:blog:new-post:compiled')
		expect(deletedCacheKeys).toContain('blog:mdx-list-items')
		expect(deletedCacheKeys).toContain('pages:old-page:compiled:remote')
		expect(deletedCacheKeys).toContain('mdx-page:pages:old-page:compiled')
		expect(deletedCacheKeys).toContain('pages:dir-list:remote')
	} finally {
		clearRuntimeBindingSource()
	}
})
