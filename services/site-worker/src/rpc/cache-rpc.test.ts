import { expect, test, vi } from 'vitest'
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

test('bumps a named cache generation in CONTENT_KV', async () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-07-15T03:14:21.000Z'))
	const put = vi.fn().mockResolvedValue(undefined)
	const env = {
		CONTENT_KV: { put },
	} as unknown as ParentWorkerEnv
	const rpc = new CacheRpc({} as ExecutionContext, env)

	await expect(rpc.bumpGeneration('transistor-episodes:12345')).resolves.toBe(
		'1784085261000',
	)
	expect(put).toHaveBeenCalledWith(
		'cache:generation:transistor-episodes:12345',
		'1784085261000',
	)
})

test('reads a named cache generation from CONTENT_KV', async () => {
	const get = vi.fn().mockResolvedValue('episodes-123')
	const env = {
		CONTENT_KV: { get },
	} as unknown as ParentWorkerEnv
	const rpc = new CacheRpc({} as ExecutionContext, env)

	await expect(rpc.getGeneration('transistor-episodes:12345')).resolves.toBe(
		'episodes-123',
	)
	expect(get).toHaveBeenCalledWith('cache:generation:transistor-episodes:12345')
})
