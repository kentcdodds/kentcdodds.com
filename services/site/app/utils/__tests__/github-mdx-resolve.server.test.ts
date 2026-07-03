import { describe, expect, test } from 'vitest'
import { resolveGitHubMdxFromDirList } from '../github-mdx-resolve.server.ts'

describe('resolveGitHubMdxFromDirList', () => {
	const blogDirList = [
		{
			name: 'introducing-the-new-kentcdodds.com.mdx',
			type: 'file' as const,
		},
		{
			name: 'state-colocation-will-make-your-react-app-faster',
			type: 'dir' as const,
		},
		{ name: 'why-i-love-remix.mdx', type: 'file' as const },
	]

	test('does not resolve slugs whose dotted suffix is treated as an extension', () => {
		expect(
			resolveGitHubMdxFromDirList(
				'blog/introducing-the-new-kentcdodds.com',
				blogDirList,
			),
		).toBe(false)
	})

	test('resolves explicit .mdx file requests', () => {
		expect(
			resolveGitHubMdxFromDirList(
				'blog/introducing-the-new-kentcdodds.com.mdx',
				blogDirList,
			),
		).toBe(true)
	})

	test('resolves directory-backed posts', () => {
		expect(
			resolveGitHubMdxFromDirList(
				'blog/state-colocation-will-make-your-react-app-faster',
				blogDirList,
			),
		).toBe(true)
	})

	test('resolves flat mdx files by stem match', () => {
		expect(
			resolveGitHubMdxFromDirList('blog/why-i-love-remix', blogDirList),
		).toBe(true)
	})
})
