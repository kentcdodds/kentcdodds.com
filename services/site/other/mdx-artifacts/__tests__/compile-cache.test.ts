import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { type MdxArtifactDocument } from '../../../types/mdx-artifacts.ts'
import {
	getOrCompileCachedDocument,
	pruneCompiledDocumentCache,
	readCachedCompiledDocument,
	writeCachedCompiledDocument,
} from '../compile-cache.ts'

function createTempCacheDir() {
	const dir = path.join(os.tmpdir(), `mdx-compile-cache-${crypto.randomUUID()}`)
	return {
		dir,
		async [Symbol.asyncDispose]() {
			await fs.rm(dir, { recursive: true, force: true })
		},
	}
}

function createDocument(slug: string): MdxArtifactDocument {
	return {
		contentDir: 'blog',
		slug,
		code: `var Component = () => null // ${slug}`,
		esm: `export default () => null // ${slug}`,
		githubResolvable: true,
		frontmatter: { title: slug },
		editLink: `https://example.com/edit/${slug}`,
	}
}

test('compile cache round-trips a document for a matching input hash', async () => {
	await using cache = createTempCacheDir()
	const document = createDocument('my-post')
	await writeCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-1',
		document,
	})
	const cached = await readCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-1',
	})
	expect(cached).toEqual(document)
})

test('compile cache misses when the input hash changed', async () => {
	await using cache = createTempCacheDir()
	await writeCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-1',
		document: createDocument('my-post'),
	})
	const cached = await readCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-2',
	})
	expect(cached).toBeNull()
})

test('compile cache misses when nothing was written', async () => {
	await using cache = createTempCacheDir()
	const cached = await readCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/never-written',
		inputHash: 'hash-1',
	})
	expect(cached).toBeNull()
})

test('embed-fallback compiles are not written to the document cache', async () => {
	await using cache = createTempCacheDir()
	const fallbackResult = await getOrCompileCachedDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-1',
		allowCacheWrite: false,
		compile: async () => createDocument('my-post'),
	})
	expect(fallbackResult.reused).toBe(false)

	// A later strict run must not reuse fallback-mode output.
	const cached = await readCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-1',
	})
	expect(cached).toBeNull()
})

test('strict compiles are reused by later runs, including fallback runs', async () => {
	await using cache = createTempCacheDir()
	const document = createDocument('my-post')
	await getOrCompileCachedDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-1',
		allowCacheWrite: true,
		compile: async () => document,
	})
	const rerun = await getOrCompileCachedDocument({
		cacheDir: cache.dir,
		key: 'blog/my-post',
		inputHash: 'hash-1',
		allowCacheWrite: false,
		compile: async () => {
			throw new Error('should not recompile a cached document')
		},
	})
	expect(rerun).toEqual({ document, reused: true })
})

test('prune removes documents whose keys no longer exist', async () => {
	await using cache = createTempCacheDir()
	await writeCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/keep-me',
		inputHash: 'hash-1',
		document: createDocument('keep-me'),
	})
	await writeCachedCompiledDocument({
		cacheDir: cache.dir,
		key: 'blog/delete-me',
		inputHash: 'hash-1',
		document: createDocument('delete-me'),
	})

	await pruneCompiledDocumentCache({
		cacheDir: cache.dir,
		validKeys: ['blog/keep-me'],
	})

	expect(
		await readCachedCompiledDocument({
			cacheDir: cache.dir,
			key: 'blog/keep-me',
			inputHash: 'hash-1',
		}),
	).not.toBeNull()
	expect(
		await readCachedCompiledDocument({
			cacheDir: cache.dir,
			key: 'blog/delete-me',
			inputHash: 'hash-1',
		}),
	).toBeNull()
})
