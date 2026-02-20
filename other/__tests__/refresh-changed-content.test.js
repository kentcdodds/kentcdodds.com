import { describe, expect, test, vi } from 'vitest'
import { refreshChangedContent } from '../refresh-changed-content.js'

function createLogger() {
	return {
		log: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}

describe('refreshChangedContent', () => {
	test('skips refresh when no content files changed', async () => {
		const fetchJsonImpl = vi.fn(async () => ({ sha: 'compare-sha' }))
		const getChangedFilesImpl = vi.fn(async () => [
			{ changeType: 'modified', filename: 'app/routes/index.tsx' },
		])
		const postRefreshCacheImpl = vi.fn()
		const log = createLogger()

		const result = await refreshChangedContent({
			currentCommitSha: 'current-sha',
			fetchJsonImpl,
			getChangedFilesImpl,
			postRefreshCacheImpl,
			log,
		})

		expect(result).toEqual({ status: 'no-content-changes' })
		expect(postRefreshCacheImpl).not.toHaveBeenCalled()
	})

	test('retries refresh request and eventually succeeds', async () => {
		const fetchJsonImpl = vi.fn(async () => ({ sha: 'compare-sha' }))
		const getChangedFilesImpl = vi.fn(async () => [
			{
				changeType: 'modified',
				filename: 'content/blog/some-post.mdx',
			},
		])
		const postRefreshCacheImpl = vi
			.fn()
			.mockRejectedValueOnce(new Error('Unexpected Server Error'))
			.mockResolvedValueOnce({ ok: true })
		const log = createLogger()

		const result = await refreshChangedContent({
			currentCommitSha: 'current-sha',
			fetchJsonImpl,
			getChangedFilesImpl,
			postRefreshCacheImpl,
			log,
			maxRefreshAttempts: 3,
			retryDelayMs: 1,
		})

		expect(result).toEqual({ status: 'refreshed', attempts: 2 })
		expect(postRefreshCacheImpl).toHaveBeenCalledTimes(2)
		expect(postRefreshCacheImpl).toHaveBeenLastCalledWith({
			postData: {
				contentPaths: ['blog/some-post.mdx'],
				commitSha: 'current-sha',
			},
		})
		expect(log.warn).toHaveBeenCalledTimes(1)
	})

	test('returns refresh-failed after exhausting retries without throwing', async () => {
		const fetchJsonImpl = vi.fn(async () => ({ sha: 'compare-sha' }))
		const getChangedFilesImpl = vi.fn(async () => [
			{
				changeType: 'modified',
				filename: 'content/blog/some-post.mdx',
			},
		])
		const postRefreshCacheImpl = vi
			.fn()
			.mockRejectedValue('Unexpected Server Error')
		const log = createLogger()

		const result = await refreshChangedContent({
			currentCommitSha: 'current-sha',
			fetchJsonImpl,
			getChangedFilesImpl,
			postRefreshCacheImpl,
			log,
			maxRefreshAttempts: 2,
			retryDelayMs: 1,
		})

		expect(result).toEqual({ status: 'refresh-failed', attempts: 2 })
		expect(postRefreshCacheImpl).toHaveBeenCalledTimes(2)
		expect(log.warn).toHaveBeenCalledTimes(2)
	})
})
