import { expect, test, vi } from 'vitest'
import { callKentEpisodesCacheGenerationKey } from '../../../site/app/utils/call-kent-cache-keys.ts'
import { CacheRpc } from './cache-rpc.ts'
import type { ParentWorkerEnv } from './types.ts'

test('bumpPageCacheGeneration updates CONTENT_KV', async () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-07-15T03:14:21.000Z'))
	const put = vi.fn().mockResolvedValue(undefined)
	const env = {
		CONTENT_KV: { put },
	} as unknown as ParentWorkerEnv
	const rpc = new CacheRpc({} as ExecutionContext, env)

	await expect(rpc.bumpPageCacheGeneration()).resolves.toBe('1784085261000')
	expect(put).toHaveBeenCalledWith('page-cache:generation', '1784085261000')
})

test('invalidates Call Kent episode and page cache generations together', async () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-07-15T03:14:21.000Z'))
	const put = vi.fn().mockResolvedValue(undefined)
	const env = {
		CONTENT_KV: { put },
	} as unknown as ParentWorkerEnv
	const rpc = new CacheRpc({} as ExecutionContext, env)

	await expect(rpc.invalidateCallKentCaches()).resolves.toEqual({
		episodesCacheGeneration: '1784085261000',
		pageCacheGeneration: '1784085261000',
	})
	expect(put).toHaveBeenCalledWith(
		callKentEpisodesCacheGenerationKey,
		'1784085261000',
	)
	expect(put).toHaveBeenCalledWith('page-cache:generation', '1784085261000')
})

test('reads the persisted Call Kent episode cache generation', async () => {
	const get = vi.fn().mockResolvedValue('episodes-123')
	const env = {
		CONTENT_KV: { get },
	} as unknown as ParentWorkerEnv
	const rpc = new CacheRpc({} as ExecutionContext, env)

	await expect(rpc.getCallKentEpisodesCacheGeneration()).resolves.toBe(
		'episodes-123',
	)
	expect(get).toHaveBeenCalledWith(callKentEpisodesCacheGenerationKey)
})
