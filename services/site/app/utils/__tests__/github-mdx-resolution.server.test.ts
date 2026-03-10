import { describe, expect, test } from 'vitest'
import { GITHUB_CONTENT_PATH } from '../github-content-paths.server.ts'
import { downloadMdxFileOrDirectory } from '../github.server.ts'

describe('github mdx resolution', () => {
	test('does not prefix-match directory names for missing slugs', async () => {
		// `{GITHUB_CONTENT_PATH}/blog/use-react-error-boundary` does not exist, but
		// `{GITHUB_CONTENT_PATH}/blog/use-react-error-boundary-to-handle-errors-in-react` does.
		// This should return no files so the blog route can 404 + negative-cache.
		await expect(
			downloadMdxFileOrDirectory('blog/use-react-error-boundary'),
		).resolves.toEqual({
			entry: `${GITHUB_CONTENT_PATH}/blog/use-react-error-boundary`,
			files: [],
		})
	})

	test('explicit `.mdx` file requests also produce a canonical virtual index path', async () => {
		// This repo has posts stored as `{GITHUB_CONTENT_PATH}/blog/<slug>.mdx`.
		const result = await downloadMdxFileOrDirectory('blog/why-i-love-remix.mdx')
		expect(result.entry).toBe(
			`${GITHUB_CONTENT_PATH}/blog/why-i-love-remix.mdx`,
		)
		expect(
			result.files.some(
				(f) =>
					f.path === `${GITHUB_CONTENT_PATH}/blog/why-i-love-remix/index.mdx`,
			),
		).toBe(true)
	})

	test('downloads a real directory-backed post', async () => {
		const result = await downloadMdxFileOrDirectory(
			'blog/use-react-error-boundary-to-handle-errors-in-react',
		)

		expect(result.entry).toBe(
			`${GITHUB_CONTENT_PATH}/blog/use-react-error-boundary-to-handle-errors-in-react`,
		)
		expect(result.files.length).toBeGreaterThan(0)
		expect(
			result.files.some(
				(f) =>
					f.path ===
					`${GITHUB_CONTENT_PATH}/blog/use-react-error-boundary-to-handle-errors-in-react/index.mdx`,
			),
		).toBe(true)
	})
})
