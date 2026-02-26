import { expect, test, vi } from 'vitest'
import { serializeMdxRemoteDocument } from '#app/mdx-remote/index.ts'
import {
	buildMdxPageFromRemoteDocument,
	getMdxRemoteDirectoryEntries,
	getMdxRemoteDocument,
	getMdxRemoteDocumentKey,
	getMdxRemoteManifest,
} from '#app/utils/mdx-remote-documents.server.ts'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '#app/utils/runtime-bindings.server.ts'

function createRemoteDocument({
	slug,
	title = 'Hello world',
}: {
	slug: string
	title?: string
}) {
	return {
		schemaVersion: 1 as const,
		slug,
		frontmatter: {
			title,
			date: '2026-02-25',
		},
		compiledAt: '2026-02-25T00:00:00.000Z',
		root: {
			type: 'root' as const,
			children: [
				{
					type: 'element' as const,
					name: 'p',
					children: [{ type: 'text' as const, value: 'Hello world' }],
				},
			],
		},
	}
}

test('getMdxRemoteDocumentKey maps supported content directories', () => {
	expect(getMdxRemoteDocumentKey({ contentDir: 'blog', slug: 'post' })).toBe(
		'blog/post.json',
	)
	expect(getMdxRemoteDocumentKey({ contentDir: 'pages', slug: 'about' })).toBe(
		'pages/about.json',
	)
	expect(getMdxRemoteDocumentKey({ contentDir: 'unknown', slug: 'x' })).toBeNull()
})

test('getMdxRemoteDocument loads from runtime KV binding first', async () => {
	const document = createRemoteDocument({ slug: 'kv-post' })
	setRuntimeBindingSource({
		MDX_REMOTE_KV: {
			get: vi.fn(async () => serializeMdxRemoteDocument(document)),
		},
	})

	try {
		const result = await getMdxRemoteDocument({
			contentDir: 'blog',
			slug: 'kv-post',
		})
		expect(result).toMatchObject({
			slug: 'kv-post',
			frontmatter: {
				title: 'Hello world',
			},
		})
	} finally {
		clearRuntimeBindingSource()
	}
})

test('getMdxRemoteDocument returns null when kv artifact is missing', async () => {
	setRuntimeBindingSource({
		MDX_REMOTE_KV: {
			get: vi.fn(async () => null),
		},
	})

	try {
		const result = await getMdxRemoteDocument({
			contentDir: 'blog',
			slug: 'missing-post',
		})
		expect(result).toBeNull()
	} finally {
		clearRuntimeBindingSource()
	}
})

test('getMdxRemoteDocument throws when MDX_REMOTE_KV binding is missing', async () => {
	await expect(
		getMdxRemoteDocument({
			contentDir: 'blog',
			slug: 'no-binding',
		}),
	).rejects.toThrow('Missing required runtime binding: MDX_REMOTE_KV')
})

test('getMdxRemoteManifest loads entries from runtime bindings', async () => {
	setRuntimeBindingSource({
		MDX_REMOTE_KV: {
			get: vi.fn(async (key: string) => {
				if (key !== 'manifest.json') return null
				return JSON.stringify({
					entries: [
						{ collection: 'blog', slug: 'first-post' },
						{ collection: 'pages', slug: 'uses' },
					],
				})
			}),
		},
	})

	try {
		const manifest = await getMdxRemoteManifest()
		expect(manifest).toEqual({
			entries: [
				{ collection: 'blog', slug: 'first-post' },
				{ collection: 'pages', slug: 'uses' },
			],
		})
		const blogEntries = await getMdxRemoteDirectoryEntries('blog')
		expect(blogEntries).toEqual([{ name: 'first-post', slug: 'first-post' }])
	} finally {
		clearRuntimeBindingSource()
	}
})

test('buildMdxPageFromRemoteDocument builds mdx page metadata', () => {
	const document = createRemoteDocument({ slug: 'page-build' })
	const page = buildMdxPageFromRemoteDocument({
		contentDir: 'blog',
		slug: 'page-build',
		document,
	})
	expect(page.remoteDocument?.slug).toBe('page-build')
	expect(page.code).toBe('')
	expect(page.editLink).toContain('/content/blog/page-build/index.mdx')
	expect(page.dateDisplay).toBe('February 25th, 2026')
})
