import { describe, expect, test } from 'vitest'
import {
	clearRuntimeEnvSource,
	setRuntimeEnvSource,
} from '../env.server.ts'
import { downloadMdxFileOrDirectory } from '../github.server.ts'

async function withMockedGithubContent<T>(callback: () => Promise<T>) {
	setRuntimeEnvSource({ MOCKS: 'true' })
	try {
		return await callback()
	} finally {
		clearRuntimeEnvSource()
	}
}

describe('github mdx resolution', () => {
	test('does not prefix-match directory names for missing slugs', async () => {
		// `content/blog/use-react-error-boundary` does not exist, but
		// `content/blog/use-react-error-boundary-to-handle-errors-in-react` does.
		// This should return no files so the blog route can 404 + negative-cache.
		await withMockedGithubContent(async () => {
			await expect(
				downloadMdxFileOrDirectory('blog/use-react-error-boundary'),
			).resolves.toEqual({
				entry: 'content/blog/use-react-error-boundary',
				files: [],
			})
		})
	})

	test('explicit `.mdx` file requests do not resolve in normalized layout', async () => {
		const result = await withMockedGithubContent(() =>
			downloadMdxFileOrDirectory('blog/why-i-love-remix.mdx'),
		)
		expect(result).toEqual({
			entry: 'content/blog/why-i-love-remix.mdx',
			files: [],
		})
	})

	test('downloads a real directory-backed post', async () => {
		const result = await withMockedGithubContent(() =>
			downloadMdxFileOrDirectory(
				'blog/use-react-error-boundary-to-handle-errors-in-react',
			),
		)

		expect(result.entry).toBe(
			'content/blog/use-react-error-boundary-to-handle-errors-in-react/index.mdx',
		)
		expect(result.files.length).toBeGreaterThan(0)
		expect(
			result.files.some(
				(f) =>
					f.path ===
					'content/blog/use-react-error-boundary-to-handle-errors-in-react/index.mdx',
			),
		).toBe(true)
	})
})
