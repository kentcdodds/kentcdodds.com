import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test, vi } from 'vitest'

const oneDay = 1000 * 60 * 60 * 24

describe('mdx not-found caching', () => {
	test('caches missing mdx pages for 1 day (no swr)', async () => {
		const originalEnv = {
			CACHE_DATABASE_PATH: process.env.CACHE_DATABASE_PATH,
		}

		const cacheDbPath = path.join(os.tmpdir(), `kcd-cache-${randomUUID()}.db`)

		try {
			process.env.CACHE_DATABASE_PATH = cacheDbPath

			vi.resetModules()
			// `cache.server.ts` imports `getUser` from `session.server.ts`, which pulls
			// in Prisma + lots of env requirements. This test doesn't need that.
			vi.doMock('../session.server.ts', () => {
				return { getUser: async () => null }
			})

			const { getMdxPage } = await import('../mdx.server.ts')
			const { cache } = await import('../cache.server.ts')
			const { setRuntimeBindingSource, clearRuntimeBindingSource } = await import(
				'../runtime-bindings.server.ts'
			)

			const slug = `definitely-does-not-exist-${randomUUID()}`
			setRuntimeBindingSource({
				MDX_REMOTE_KV: {
					get: async () => null,
				},
			})
			const page = await getMdxPage({ contentDir: 'blog', slug }, {})
			clearRuntimeBindingSource()
			expect(page).toBeNull()

			const entry = await cache.get(`mdx-page:blog:${slug}:compiled`)
			expect(entry).not.toBeNull()
			expect(entry!.metadata.ttl).toBe(oneDay)
			expect(entry!.metadata.swr).toBe(0)
		} finally {
			// Prevent mock/module state leaking if more tests are added later.
			vi.restoreAllMocks()
			vi.unmock('../session.server.ts')
			vi.resetModules()

			for (const [key, value] of Object.entries(originalEnv)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}
			await Promise.all(
				[
					cacheDbPath,
					// SQLite WAL mode may create these companion files.
					`${cacheDbPath}-wal`,
					`${cacheDbPath}-shm`,
				].map((p) => fs.rm(p, { force: true }).catch(() => {})),
			)
		}
	})
})
