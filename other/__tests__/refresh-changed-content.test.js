import { describe, expect, test, vi } from 'vitest'
import {
	getErrorMessage,
	refreshChangedContent,
} from '../refresh-changed-content.js'

function createLogger() {
	return {
		log: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}

describe('refreshChangedContent', () => {
	test('returns no-compare-sha when fetch responses do not provide a sha', async () => {
		const fetchJsonImpl = vi
			.fn()
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(undefined)
		const getChangedFilesImpl = vi.fn()
		const postRefreshCacheImpl = vi.fn()
		const log = createLogger()

		const result = await refreshChangedContent({
			currentCommitSha: 'current-sha',
			baseUrl: 'https://example.test',
			fetchJsonImpl,
			getChangedFilesImpl,
			postRefreshCacheImpl,
			log,
		})

		expect(result).toEqual({ status: 'no-compare-sha' })
		expect(fetchJsonImpl).toHaveBeenCalledTimes(2)
		expect(getChangedFilesImpl).not.toHaveBeenCalled()
		expect(postRefreshCacheImpl).not.toHaveBeenCalled()
	})

	test('throws when currentCommitSha is missing', async () => {
		await expect(refreshChangedContent()).rejects.toThrow(
			'currentCommitSha is required',
		)
	})

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

	test('skips refresh when getChangedFilesImpl resolves to null', async () => {
		const fetchJsonImpl = vi.fn(async () => ({ sha: 'compare-sha' }))
		const getChangedFilesImpl = vi.fn(async () => null)
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
		expect(getChangedFilesImpl).toHaveBeenCalledTimes(1)
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

describe('getErrorMessage', () => {
	test('normalizes string and non-Error values to readable strings', () => {
		expect(getErrorMessage('Unexpected Server Error')).toBe(
			'Unexpected Server Error',
		)
		expect(getErrorMessage({ reason: 'boom' })).toBe('{"reason":"boom"}')
		expect(getErrorMessage(123)).toBe('123')
		expect(getErrorMessage(undefined)).toBe('undefined')
		expect(getErrorMessage(Symbol.for('boom'))).toBe('Symbol(boom)')
	})
})
