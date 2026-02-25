import { expect, test, vi } from 'vitest'
import { serializeMdxRemoteDocument } from '#app/mdx-remote/index.ts'
import { clearRuntimeEnvSource, setRuntimeEnvSource } from '#app/utils/env.server.ts'

const githubMocks = vi.hoisted(() => ({
	downloadDirList: vi.fn(),
	downloadMdxFileOrDirectory: vi.fn(),
}))

vi.mock('#app/utils/github.server.ts', () => githubMocks)

const compileMdxMocks = vi.hoisted(() => ({
	compileMdx: vi.fn(),
}))

vi.mock('#app/utils/compile-mdx.server.ts', () => compileMdxMocks)

import { getMdxPage } from '#app/utils/mdx.server.ts'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'

function createRemoteDocument(slug: string) {
	return {
		schemaVersion: 1 as const,
		slug,
		frontmatter: {
			title: `title-${slug}`,
			date: '2026-02-25',
		},
		compiledAt: '2026-02-25T00:00:00.000Z',
		root: {
			type: 'root' as const,
			children: [{ type: 'text' as const, value: 'hello' }],
		},
	}
}

test('getMdxPage prefers mdx-remote documents when available', async () => {
	const slug = `remote-${crypto.randomUUID()}`
	compileMdxMocks.compileMdx.mockReset()
	githubMocks.downloadMdxFileOrDirectory.mockReset()
	setRuntimeEnvSource({ ENABLE_MDX_REMOTE: 'true' })
	setRuntimeBindingSource({
		MDX_REMOTE_KV: {
			get: vi.fn(async () =>
				serializeMdxRemoteDocument(createRemoteDocument(slug)),
			),
		},
	})

	try {
		const page = await getMdxPage(
			{ contentDir: 'blog', slug },
			{ forceFresh: true },
		)
		expect(page?.remoteDocument?.slug).toBe(slug)
		expect(page?.frontmatter.title).toBe(`title-${slug}`)
		expect(page?.code).toBe('')
		expect(githubMocks.downloadMdxFileOrDirectory).not.toHaveBeenCalled()
		expect(compileMdxMocks.compileMdx).not.toHaveBeenCalled()
	} finally {
		clearRuntimeBindingSource()
		clearRuntimeEnvSource()
	}
})

test('getMdxPage falls back to github + compile path when mdx-remote missing', async () => {
	const slug = `fallback-${crypto.randomUUID()}`
	compileMdxMocks.compileMdx.mockReset()
	githubMocks.downloadMdxFileOrDirectory.mockReset()
	githubMocks.downloadMdxFileOrDirectory.mockResolvedValue({
		entry: `content/blog/${slug}/index.mdx`,
		files: [{ filepath: `content/blog/${slug}/index.mdx`, content: '# test' }],
	})
	compileMdxMocks.compileMdx.mockResolvedValue({
		code: 'export default function Page() { return null }',
		frontmatter: { title: 'Fallback path' },
	})
	setRuntimeEnvSource({ ENABLE_MDX_REMOTE: 'true' })
	setRuntimeBindingSource({
		MDX_REMOTE_KV: {
			get: vi.fn(async () => null),
		},
	})

	try {
		const page = await getMdxPage(
			{ contentDir: 'blog', slug },
			{ forceFresh: true },
		)
		expect(page?.remoteDocument).toBeUndefined()
		expect(page?.frontmatter.title).toBe('Fallback path')
		expect(githubMocks.downloadMdxFileOrDirectory).toHaveBeenCalledTimes(1)
		expect(compileMdxMocks.compileMdx).toHaveBeenCalledTimes(1)
	} finally {
		clearRuntimeBindingSource()
		clearRuntimeEnvSource()
	}
})
