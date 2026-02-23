import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { githubHandlers } from '../../../mocks/github.ts'
import { downloadMdxFileOrDirectory } from '../github.server.ts'

const server = setupServer(...githubHandlers)

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
	server.close()
})

describe('github mdx resolution', () => {
	test('does not prefix-match directory names for missing slugs', async () => {
		// `content/blog/use-react-error-boundary` does not exist, but
		// `content/blog/use-react-error-boundary-to-handle-errors-in-react` does.
		// This should return no files so the blog route can 404 + negative-cache.
		await expect(
			downloadMdxFileOrDirectory('blog/use-react-error-boundary'),
		).resolves.toEqual({
			entry: 'content/blog/use-react-error-boundary',
			files: [],
		})
	})

	test('downloads a real directory-backed post', async () => {
		const result = await downloadMdxFileOrDirectory(
			'blog/use-react-error-boundary-to-handle-errors-in-react',
		)

		expect(result.entry).toBe(
			'content/blog/use-react-error-boundary-to-handle-errors-in-react',
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

