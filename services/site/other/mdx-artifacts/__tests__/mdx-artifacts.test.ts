import { describe, expect, test } from 'vitest'
import { computeContentVersion } from '../content-version.ts'
import {
	discoverLocalMdxDocuments,
	readLocalMdxFiles,
} from '../local-content.ts'
import { compileMdxArtifactDocument } from '../compile-document.ts'
import { verifyDocumentRenderParity } from '../render-parity.ts'

describe('mdx-artifacts content version', () => {
	test('is stable for the same inputs', () => {
		const inputs = [
			{ path: 'a/file.mdx', content: 'hello' },
			{ path: 'b/file.mdx', content: 'world' },
		]
		expect(computeContentVersion(inputs)).toBe(computeContentVersion(inputs))
	})

	test('changes when content changes', () => {
		const base = [{ path: 'a/file.mdx', content: 'hello' }]
		const changed = [{ path: 'a/file.mdx', content: 'hello!' }]
		expect(computeContentVersion(base)).not.toBe(computeContentVersion(changed))
	})
})

describe('mdx-artifacts local content discovery', () => {
	test('discovers blog, pages, and excludes README entries', async () => {
		const documents = await discoverLocalMdxDocuments()
		expect(documents.some((doc) => doc.key === 'pages/uses')).toBe(true)
		expect(documents.some((doc) => doc.key.startsWith('blog/'))).toBe(true)
		expect(documents.some((doc) => /readme/i.test(doc.slug))).toBe(false)
	})

	test('reads directory posts with co-located files', async () => {
		const download = await readLocalMdxFiles(
			'blog',
			'state-colocation-will-make-your-react-app-faster',
		)
		expect(download).not.toBeNull()
		expect(download!.files.length).toBeGreaterThan(1)
	})
})

describe('mdx-artifacts compile parity', () => {
	test('renders identical HTML for a simple page', async () => {
		const document = await compileMdxArtifactDocument({
			contentDir: 'pages',
			slug: 'uses',
		})
		const parity = await verifyDocumentRenderParity(document, 'pages/uses')
		expect(parity.matches).toBe(true)
	}, 120_000)

	test('renders identical HTML for a mermaid post', async () => {
		const document = await compileMdxArtifactDocument({
			contentDir: 'blog',
			slug: 'building-semantic-search-on-my-content',
		})
		const parity = await verifyDocumentRenderParity(
			document,
			'blog/building-semantic-search-on-my-content',
		)
		expect(parity.matches).toBe(true)
	}, 180_000)

	test('renders identical HTML for a directory post with components', async () => {
		const document = await compileMdxArtifactDocument({
			contentDir: 'blog',
			slug: 'state-colocation-will-make-your-react-app-faster',
		})
		expect(document.githubResolvable).toBe(true)
		const parity = await verifyDocumentRenderParity(
			document,
			'blog/state-colocation-will-make-your-react-app-faster',
		)
		expect(parity.matches).toBe(true)
	}, 180_000)

	test('marks dotted slugs that prod GitHub resolution cannot fetch', async () => {
		const document = await compileMdxArtifactDocument({
			contentDir: 'blog',
			slug: 'introducing-the-new-kentcdodds.com',
		})
		expect(document.githubResolvable).toBe(false)
	}, 180_000)
})
