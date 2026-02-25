import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test, vi } from 'vitest'
import { serializeMdxRemoteDocument } from '#app/mdx-remote/index.ts'
import { clearRuntimeEnvSource, setRuntimeEnvSource } from '#app/utils/env.server.ts'
import {
	buildMdxPageFromRemoteDocument,
	getMdxRemoteDocument,
	getMdxRemoteDocumentKey,
	shouldUseMdxRemoteDocuments,
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

test('shouldUseMdxRemoteDocuments reads env toggle', () => {
	setRuntimeEnvSource({ ENABLE_MDX_REMOTE: 'true' })
	try {
		expect(shouldUseMdxRemoteDocuments()).toBe(true)
	} finally {
		clearRuntimeEnvSource()
	}
})

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
	setRuntimeEnvSource({ ENABLE_MDX_REMOTE: 'true' })
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
		clearRuntimeEnvSource()
	}
})

test('getMdxRemoteDocument falls back to remote base url fetch', async () => {
	const document = createRemoteDocument({ slug: 'remote-fetch' })
	const fetchMock = vi.fn(
		async (_input: RequestInfo | URL) =>
		new Response(serializeMdxRemoteDocument(document), { status: 200 }),
	)
	vi.stubGlobal('fetch', fetchMock)
	setRuntimeEnvSource({
		ENABLE_MDX_REMOTE: 'true',
		MDX_REMOTE_BASE_URL: 'https://mdx-remote.example.com',
	})

	try {
		const result = await getMdxRemoteDocument({
			contentDir: 'blog',
			slug: 'remote-fetch',
		})
		expect(result?.slug).toBe('remote-fetch')
		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [fetchInput] = fetchMock.mock.calls[0] ?? []
		expect(String(fetchInput)).toBe(
			'https://mdx-remote.example.com/blog/remote-fetch.json',
		)
	} finally {
		vi.unstubAllGlobals()
		clearRuntimeEnvSource()
	}
})

test('getMdxRemoteDocument falls back to local artifact files in mocks mode', async () => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdx-remote-artifacts-'))
	const artifactPath = path.join(tempDir, 'blog')
	await fs.mkdir(artifactPath, { recursive: true })
	const document = createRemoteDocument({ slug: 'local-artifact' })
	await fs.writeFile(
		path.join(artifactPath, 'local-artifact.json'),
		serializeMdxRemoteDocument(document),
		'utf8',
	)

	setRuntimeEnvSource({
		ENABLE_MDX_REMOTE: 'true',
		MOCKS: 'true',
		MDX_REMOTE_LOCAL_ARTIFACT_DIRECTORY: tempDir,
	})

	try {
		const result = await getMdxRemoteDocument({
			contentDir: 'blog',
			slug: 'local-artifact',
		})
		expect(result?.slug).toBe('local-artifact')
	} finally {
		clearRuntimeEnvSource()
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
