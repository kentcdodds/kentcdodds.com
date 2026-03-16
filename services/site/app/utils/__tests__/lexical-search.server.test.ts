import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { describe, expect, test, vi } from 'vitest'

describe('lexical search sqlite index', () => {
	test('syncs lexical artifacts from R2 and queries them with FTS', async () => {
		const originalEnv = {
			CACHE_DATABASE_PATH: process.env.CACHE_DATABASE_PATH,
			LITEFS_DIR: process.env.LITEFS_DIR,
			FLY_REGION: process.env.FLY_REGION,
			FLY_MACHINE_ID: process.env.FLY_MACHINE_ID,
			R2_BUCKET: process.env.R2_BUCKET,
			R2_ENDPOINT: process.env.R2_ENDPOINT,
			R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
			R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
		}

		const cacheDbPath = path.join(os.tmpdir(), `kcd-lexical-${randomUUID()}.db`)

		try {
			process.env.CACHE_DATABASE_PATH = cacheDbPath
			process.env.LITEFS_DIR = path.resolve(process.cwd(), 'prisma')
			process.env.FLY_REGION = 'test'
			process.env.FLY_MACHINE_ID = 'test'
			process.env.R2_BUCKET = 'mock-r2-bucket'
			process.env.R2_ENDPOINT = 'https://mock.r2.cloudflarestorage.com'
			process.env.R2_ACCESS_KEY_ID = 'MOCKR2ACCESSKEYID'
			process.env.R2_SECRET_ACCESS_KEY = 'MOCKR2SECRETACCESSKEY'

			vi.resetModules()
			vi.doMock('../session.server.ts', () => {
				return { getUser: async () => null }
			})
			vi.doMock('#app/routes/resources/cache.sqlite.ts', () => {
				return { updatePrimaryCacheValue: undefined }
			})

			const {
				getLexicalSearchChunkCount,
				queryLexicalSearch,
				syncLexicalSearchArtifactsFromR2,
			} = await import('../lexical-search.server.ts')

			await syncLexicalSearchArtifactsFromR2({ force: true })

			expect(getLexicalSearchChunkCount()).toBeGreaterThan(0)

			const youtubeMatches = queryLexicalSearch({
				query: 'shallow rendering React',
				topK: 5,
			})
			expect(youtubeMatches[0]?.type).toBe('youtube')
			expect(youtubeMatches[0]?.startSeconds).toBe(123)

			const repoMatches = queryLexicalSearch({
				query: 'Remix loaders actions',
				topK: 5,
			})
			expect(repoMatches.some((match) => match.type === 'blog')).toBe(true)
			const repoMatch = repoMatches.find((match) => match.type === 'blog')
			expect(repoMatch?.imageUrl).toBeUndefined()
			expect(repoMatch?.imageAlt).toBeUndefined()

			const client = new S3Client({
				region: 'auto',
				endpoint: process.env.R2_ENDPOINT,
				forcePathStyle: true,
				credentials: {
					accessKeyId: process.env.R2_ACCESS_KEY_ID!,
					secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
				},
			})
			await client.send(
				new DeleteObjectCommand({
					Bucket: process.env.R2_BUCKET,
					Key: 'lexical-search/podcasts.json',
				}),
			)
			await syncLexicalSearchArtifactsFromR2({ force: true })

			const podcastMatches = queryLexicalSearch({
				query: 'authentication debugging advice',
				topK: 5,
			})
			expect(podcastMatches.some((match) => match.type === 'ck')).toBe(false)
		} finally {
			vi.restoreAllMocks()
			vi.unmock('../session.server.ts')
			vi.unmock('#app/routes/resources/cache.sqlite.ts')
			vi.resetModules()

			for (const [key, value] of Object.entries(originalEnv)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}

			await Promise.all(
				[
					cacheDbPath,
					`${cacheDbPath}-wal`,
					`${cacheDbPath}-shm`,
				].map((filePath) => fs.rm(filePath, { force: true }).catch(() => {})),
			)
		}
	})
})
