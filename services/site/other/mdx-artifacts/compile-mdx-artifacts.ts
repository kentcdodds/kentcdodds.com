#!/usr/bin/env node
import './bootstrap-env.ts'
import fs from 'node:fs/promises'
import path from 'node:path'
import pLimit from 'p-limit'
import {
	getLocalBlogMdxListItemsUncached,
	getLocalMdxDirList,
} from '#app/utils/mdx.server.ts'
import { type MdxArtifactBundle } from '../../types/mdx-artifacts.ts'
import { compileMdxArtifactDocument } from './compile-document.ts'
import { computeContentVersion } from './content-version.ts'
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
}

function parseArgs(argv: Array<string>): CliOptions {
	let out = '/tmp/bundle.json'
	let concurrency = 1
	let only: Array<string> | null = null

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		if (arg === '--out') {
			out = argv[++index] ?? out
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
		if (arg === '--help' || arg === '-h') {
			printHelp()
			process.exit(0)
		}
		throw new Error(`Unknown argument: ${arg}`)
	}

	return { out, concurrency, only }
}

function printHelp() {
	console.log(`Usage: node other/mdx-artifacts/compile-mdx-artifacts.ts [options]

Options:
  --out <path>           Output bundle JSON path (default: /tmp/bundle.json)
  --concurrency <n>      Parallel compile workers (default: 1)
  --only <keys>          Comma-separated document keys (e.g. blog/foo,pages/uses)
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

async function main() {
	const startedAt = Date.now()
	const options = parseArgs(process.argv.slice(2))
	const allDocuments = await discoverLocalMdxDocuments()
	const documents = filterDocuments(allDocuments, options.only)

	if (!documents.length) {
		throw new Error('No MDX documents matched the compile selection')
	}

	const limit = pLimit(options.concurrency)
	const failures: Array<{ key: string; error: string }> = []
	const compiledEntries = await Promise.all(
		documents.map((document) =>
			limit(async () => {
				try {
					const compiled = await compileMdxArtifactDocument(document)
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
				failures: failures.length,
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
