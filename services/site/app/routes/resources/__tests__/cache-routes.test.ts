import { randomUUID } from 'node:crypto'
import { afterEach, expect, test, vi } from 'vitest'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'

const sessionServerMocks = vi.hoisted(() => ({
	requireAdminUser: vi.fn(),
}))

vi.mock('#app/utils/session.server.ts', () => sessionServerMocks)

import { loader as cacheAdminLoader } from '../../cache.admin.tsx'
import { loader as lruCacheResourceLoader } from '../cache.lru.$cacheKey.ts'
import { action as sqliteCacheAction } from '../cache.sqlite.ts'
import { loader as sqliteCacheResourceLoader } from '../cache.sqlite_.$cacheKey.ts'

afterEach(() => {
	clearRuntimeBindingSource()
	vi.clearAllMocks()
})

function createD1Binding() {
	return {
		prepare: vi.fn(),
		batch: vi.fn(),
		exec: vi.fn(),
		dump: vi.fn(),
		withSession: vi.fn(),
	}
}

async function expectNotFound(promise: Promise<unknown>) {
	await expect(promise).rejects.toMatchObject({ status: 404 })
}

test('cache admin is unavailable when the file cache backend is unavailable', async () => {
	setRuntimeBindingSource({ APP_DB: createD1Binding() })

	await expectNotFound(
		cacheAdminLoader({
			request: new Request('http://localhost/cache/admin'),
		} as any),
	)
})

test('sqlite cache resources are unavailable when the file cache backend is unavailable', async () => {
	setRuntimeBindingSource({ APP_DB: createD1Binding() })

	await expectNotFound(
		sqliteCacheResourceLoader({
			request: new Request('http://localhost/resources/cache/sqlite/key'),
			params: { cacheKey: 'key' },
		} as any),
	)
	await expectNotFound(
		sqliteCacheAction({
			request: new Request('http://localhost/resources/cache/sqlite', {
				method: 'POST',
				body: JSON.stringify({ key: 'key' }),
			}),
		} as any),
	)
})

test('lru cache resources no longer expose instance metadata', async () => {
	const { lruCache } = await import('#app/utils/cache.server.ts')
	const cacheKey = `lru-route:${randomUUID()}`
	const entry = {
		value: { ok: true },
		metadata: {
			createdTime: Date.now(),
			swr: 0,
			ttl: 60_000,
		},
	}
	lruCache.set(cacheKey, entry)

	const result = (await lruCacheResourceLoader({
		request: new Request(
			`http://localhost/resources/cache/lru/${encodeURIComponent(cacheKey)}`,
		),
		params: { cacheKey },
	} as any)) as {
		type?: string
		data?: unknown
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({
		cacheKey,
		value: entry,
	})
})
