#!/usr/bin/env node
import './bootstrap-env.ts'
import fs from 'node:fs/promises'
import path from 'node:path'
import pLimit from 'p-limit'
import {
	configureMdxCompileOptions,
	getEmbedFallbackCount,
} from '#app/utils/compile-mdx.server.ts'
import {
	getLocalBlogMdxListItemsUncached,
	getLocalMdxDirList,
} from '#app/utils/mdx.server.ts'
import { setRuntimeBindingSource } from '#app/utils/runtime-bindings.server.ts'
import { type MdxArtifactBundle } from '../../types/mdx-artifacts.ts'
import {
	getOrCompileCachedDocument,
	pruneCompiledDocumentCache,
} from './compile-cache.ts'
import { compileMdxArtifactDocument } from './compile-document.ts'
import { computeContentVersion } from './content-version.ts'
import { createDiskCacheRpc } from './disk-cache-rpc.ts'
import { computeDocumentInputHash } from './document-input-hash.ts'
import {
	collectContentInputFiles,
	discoverLocalMdxDocuments,
	readLocalDataFiles,
	type MdxDocumentRef,
} from './local-content.ts'

type CliOptions = {
	out: string
	concurrency: number
	only: Array<string> | null
	allowEmbedFallback: boolean
	cacheDir: string | null
}

function parseArgs(argv: Array<string>): CliOptions {
	let out = '/tmp/bundle.json'
	let concurrency = 1
	let only: Array<string> | null = null
	let allowEmbedFallback = false
	let cacheDir: string | null = path.join(
		process.cwd(),
		'node_modules/.cache/mdx-artifacts',
	)

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		if (arg === '--out') {
			out = argv[++index] ?? out
			continue
		}
		if (arg === '--cache-dir') {
			const value = argv[++index]
			if (!value) throw new Error('--cache-dir requires a path')
			cacheDir = path.resolve(value)
			continue
		}
		if (arg === '--no-cache') {
			cacheDir = null
			continue
		}
		if (arg === '--concurrency') {
			const value = Number(argv[++index])
			if (!Number.isFinite(value) || value < 1) {
				throw new Error('--concurrency must be a positive number')
			}
			concurrency = value
			continue
		}
		if (arg === '--only') {
			const value = argv[++index]
			if (!value) throw new Error('--only requires a comma-separated list')
			only = value
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
			continue
		}
		if (arg === '--allow-embed-fallback') {
			allowEmbedFallback = true
			continue
		}
		if (arg === '--help' || arg === '-h') {
			printHelp()
			process.exit(0)
		}
		throw new Error(`Unknown argument: ${arg}`)
	}

	return { out, concurrency, only, allowEmbedFallback, cacheDir }
}

function printHelp() {
	console.log(`Usage: node other/mdx-artifacts/compile-mdx-artifacts.ts [options]

Options:
  --out <path>           Output bundle JSON path (default: /tmp/bundle.json)
  --concurrency <n>      Parallel compile workers (default: 1)
  --only <keys>          Comma-separated document keys (e.g. blog/foo,pages/uses)
  --allow-embed-fallback Log and continue when embed network calls fail (plain link)
  --cache-dir <path>     Persistent compile cache directory
                         (default: node_modules/.cache/mdx-artifacts)
  --no-cache             Disable the persistent compile cache
`)
}

function filterDocuments(
	documents: Array<MdxDocumentRef>,
	only: Array<string> | null,
) {
	if (!only?.length) return documents
	const allowed = new Set(only)
	return documents.filter((document) => allowed.has(document.key))
}

async function compileDocumentWithCache({
	document,
	cacheDir,
	allowEmbedFallback,
}: {
	document: MdxDocumentRef
	cacheDir: string | null
	allowEmbedFallback: boolean
}) {
	if (!cacheDir) {
		return {
			document: await compileMdxArtifactDocument(document),
			reused: false,
		}
	}
	const inputHash = await computeDocumentInputHash(document)
	return getOrCompileCachedDocument({
		cacheDir,
		key: document.key,
		inputHash,
		allowCacheWrite: !allowEmbedFallback,
		compile: () => compileMdxArtifactDocument(document),
	})
}

async function main() {
	const startedAt = Date.now()
	const options = parseArgs(process.argv.slice(2))
	configureMdxCompileOptions({ allowEmbedFallback: options.allowEmbedFallback })
	if (options.cacheDir) {
		// Persist cachified values (tweet embed HTML, oEmbed responses, mermaid
		// SVGs) to disk so recompiles of changed documents reuse resolved embeds
		// instead of re-fetching them.
		setRuntimeBindingSource({
			CACHE_RPC: createDiskCacheRpc(path.join(options.cacheDir, 'cachified')),
		})
	}
	const allDocuments = await discoverLocalMdxDocuments()
	const documents = filterDocuments(allDocuments, options.only)

	if (!documents.length) {
		throw new Error('No MDX documents matched the compile selection')
	}

	const limit = pLimit(options.concurrency)
	const failures: Array<{ key: string; error: string }> = []
	let reusedCount = 0
	const compiledEntries = await Promise.all(
		documents.map((document) =>
			limit(async () => {
				try {
					const { document: compiled, reused } = await compileDocumentWithCache(
						{
							document,
							cacheDir: options.cacheDir,
							allowEmbedFallback: options.allowEmbedFallback,
						},
					)
					if (reused) reusedCount++
					return [document.key, compiled] as const
				} catch (error: unknown) {
					const message = error instanceof Error ? error.message : String(error)
					failures.push({ key: document.key, error: message })
					return null
				}
			}),
		),
	)

	if (failures.length) {
		for (const failure of failures) {
			console.error(`FAILED ${failure.key}: ${failure.error}`)
		}
		throw new Error(`${failures.length} document(s) failed to compile`)
	}

	if (options.cacheDir) {
		await pruneCompiledDocumentCache({
			cacheDir: options.cacheDir,
			validKeys: allDocuments.map((document) => document.key),
		})
	}

	const bundleDocuments: MdxArtifactBundle['documents'] = {}
	for (const entry of compiledEntries) {
		if (!entry) continue
		const [key, document] = entry
		bundleDocuments[key] = document
	}

	const [blogList, blogDirList, pagesDirList, dataFiles, contentInputs] =
		await Promise.all([
			getLocalBlogMdxListItemsUncached(),
			getLocalMdxDirList('blog'),
			getLocalMdxDirList('pages'),
			readLocalDataFiles(),
			collectContentInputFiles(),
		])

	const bundle: MdxArtifactBundle = {
		schemaVersion: 1,
		version: computeContentVersion(contentInputs),
		generatedAt: new Date().toISOString(),
		documents: bundleDocuments,
		blogList,
		dirLists: {
			blog: blogDirList,
			pages: pagesDirList,
		},
		dataFiles,
	}

	await fs.mkdir(path.dirname(path.resolve(options.out)), { recursive: true })
	const serialized = JSON.stringify(bundle)
	await fs.writeFile(options.out, serialized, 'utf8')

	const docSizes = Object.entries(bundleDocuments)
		.map(([key, document]) => ({
			key,
			bytes: document.code.length + document.esm.length,
		}))
		.sort((a, b) => b.bytes - a.bytes)

	const elapsedMs = Date.now() - startedAt
	console.log(
		JSON.stringify(
			{
				documents: documents.length,
				reusedFromCache: reusedCount,
				compiled: documents.length - reusedCount,
				failures: failures.length,
				embedFallbacks: getEmbedFallbackCount(),
				bundleBytes: Buffer.byteLength(serialized, 'utf8'),
				elapsedMs,
				largestDocs: docSizes.slice(0, 10),
			},
			null,
			2,
		),
	)
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
