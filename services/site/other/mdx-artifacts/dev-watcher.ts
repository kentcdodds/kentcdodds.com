#!/usr/bin/env node
import './bootstrap-env.ts'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import chokidar from 'chokidar'
import pLimit from 'p-limit'
import {
	configureMdxCompileOptions,
	getEmbedFallbackCount,
} from '#app/utils/compile-mdx.server.ts'
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

const CACHE_ROOT = path.join(process.cwd(), 'node_modules/.cache/mdx-dev')
const MODULES_DIR = path.join(CACHE_ROOT, 'modules')
const MANIFEST_PATH = path.join(CACHE_ROOT, 'manifest.json')
const MANIFEST_MODULE_PATH = path.join(CACHE_ROOT, 'manifest.module.mjs')
const COMPILED_HASH_PATH = path.join(CACHE_ROOT, 'compiled-hashes.json')
const SIDECAR_PORT = Number(process.env.MDX_DEV_SIDECAR_PORT ?? 3099)
const MSW_DATA_PATH = path.join(process.cwd(), 'mocks/msw.local.json')

type CompiledHashIndex = Record<string, string>

type ManifestDocument = MdxArtifactBundle['documents'][string]

async function readCompiledHashes(): Promise<CompiledHashIndex> {
	try {
		return JSON.parse(await fs.readFile(COMPILED_HASH_PATH, 'utf8'))
	} catch {
		return {}
	}
}

async function writeCompiledHashes(index: CompiledHashIndex) {
	await fs.mkdir(CACHE_ROOT, { recursive: true })
	await fs.writeFile(COMPILED_HASH_PATH, JSON.stringify(index, null, 2))
}

async function writeModuleFile(
	contentDir: string,
	moduleFileName: string,
	esm: string,
) {
	const targetDir = path.join(MODULES_DIR, contentDir)
	await fs.mkdir(targetDir, { recursive: true })
	await fs.writeFile(path.join(targetDir, moduleFileName), esm, 'utf8')
}

function getModuleFileName(slug: string, compiled: ManifestDocument) {
	const source = compiled.esm ?? compiled.code
	const hash = createHash('sha256').update(source).digest('hex').slice(0, 8)
	return `${slug}.${hash}.mjs`
}

function stripEsm(document: ManifestDocument) {
	const { esm: _esm, ...rest } = document
	return rest
}

async function buildManifest(
	documents: Record<string, ManifestDocument>,
): Promise<MdxArtifactBundle> {
	const [blogList, blogDirList, pagesDirList, dataFiles, contentInputs] =
		await Promise.all([
			getLocalBlogMdxListItemsUncached(),
			getLocalMdxDirList('blog'),
			getLocalMdxDirList('pages'),
			readLocalDataFiles(),
			collectContentInputFiles(),
		])

	return {
		schemaVersion: 1,
		version: computeContentVersion(contentInputs),
		generatedAt: new Date().toISOString(),
		documents,
		blogList,
		dirLists: {
			blog: blogDirList,
			pages: pagesDirList,
		},
		dataFiles,
	}
}

async function writeManifest(
	documents: Record<string, ManifestDocument>,
	moduleFiles: Record<string, string>,
) {
	const bundle = await buildManifest(documents)
	const manifestDocuments = Object.fromEntries(
		Object.entries(bundle.documents).map(([key, document]) => [
			key,
			{ ...stripEsm(document), moduleFile: moduleFiles[key] },
		]),
	)
	const manifest = {
		...bundle,
		documents: manifestDocuments,
	}
	await fs.mkdir(CACHE_ROOT, { recursive: true })
	await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest), 'utf8')
	await fs.writeFile(
		MANIFEST_MODULE_PATH,
		`export default ${JSON.stringify(manifest)}`,
		'utf8',
	)
}

async function compileDocument(document: MdxDocumentRef) {
	const compiled = await compileMdxArtifactDocument(document)
	const moduleFileName = getModuleFileName(document.slug, compiled)
	await writeModuleFile(document.contentDir, moduleFileName, compiled.esm)
	return [
		document.key,
		compiled,
		`${document.contentDir}/${moduleFileName}`,
	] as const
}

async function compileAllDocuments({
	concurrency = 4,
	only,
}: {
	concurrency?: number
	only?: Array<MdxDocumentRef>
} = {}) {
	configureMdxCompileOptions({ allowEmbedFallback: true })
	const allDocuments = only ?? (await discoverLocalMdxDocuments())
	if (!allDocuments.length) {
		throw new Error('No MDX documents found to compile for dev')
	}

	const limit = pLimit(concurrency)
	const failures: Array<{ key: string; error: string }> = []
	const compiledEntries = await Promise.all(
		allDocuments.map((document) =>
			limit(async () => {
				try {
					return await compileDocument(document)
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

	const documents: Record<string, ManifestDocument> = {}
	const moduleFiles: Record<string, string> = {}
	for (const entry of compiledEntries) {
		if (!entry) continue
		const [key, document, moduleFile] = entry
		documents[key] = document
		moduleFiles[key] = moduleFile
	}

	await writeManifest(documents, moduleFiles)
	const hashIndex: CompiledHashIndex = {}
	for (const document of allDocuments) {
		hashIndex[document.key] = documents[document.key]?.code.slice(0, 64) ?? ''
	}
	await writeCompiledHashes(hashIndex)

	console.info(
		`mdx-dev: compiled ${allDocuments.length} documents (${getEmbedFallbackCount()} embed fallbacks)`,
	)
}

async function recompileDocumentKey(key: string) {
	const [contentDir, slug] = key.split('/') as ['blog' | 'pages', string]
	if (!contentDir || !slug) return
	const compiled = await compileMdxArtifactDocument({ contentDir, slug })
	const moduleFileName = getModuleFileName(slug, compiled)
	await writeModuleFile(contentDir, moduleFileName, compiled.esm)
	const moduleFile = `${contentDir}/${moduleFileName}`

	const currentManifest = JSON.parse(
		await fs.readFile(MANIFEST_PATH, 'utf8'),
	) as MdxArtifactBundle & {
		documents: Record<string, ManifestDocument & { moduleFile?: string }>
	}
	const documents: Record<string, ManifestDocument> = {}
	const moduleFiles: Record<string, string> = {}
	for (const [docKey, doc] of Object.entries(currentManifest.documents)) {
		documents[docKey] = {
			...doc,
			esm: '',
			code: doc.code,
		}
		if (doc.moduleFile) moduleFiles[docKey] = doc.moduleFile
	}
	documents[key] = compiled
	moduleFiles[key] = moduleFile
	await writeManifest(documents, moduleFiles)

	const hashes = await readCompiledHashes()
	hashes[key] = compiled.code.slice(0, 64)
	await writeCompiledHashes(hashes)
	console.info(`mdx-dev: recompiled ${key}`)
}

function contentPathToDocumentKey(filePath: string) {
	const relative = path.relative(path.join(process.cwd(), 'content'), filePath)
	const normalized = relative.replaceAll('\\', '/')
	if (normalized.startsWith('blog/')) {
		const slug = path.basename(normalized, path.extname(normalized))
		return `blog/${slug}`
	}
	if (normalized.startsWith('pages/')) {
		const slug = path.basename(normalized, path.extname(normalized))
		return `pages/${slug}`
	}
	return null
}

async function startSidecarServer() {
	await fs.mkdir(path.dirname(MSW_DATA_PATH), { recursive: true })
	try {
		await fs.access(MSW_DATA_PATH)
	} catch {
		await fs.writeFile(MSW_DATA_PATH, '{}')
	}

	const server = createServer(async (req, res) => {
		const url = new URL(req.url ?? '/', `http://127.0.0.1:${SIDECAR_PORT}`)
		if (req.method === 'GET' && url.pathname === '/health') {
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ ok: true }))
			return
		}

		if (req.method === 'GET' && url.pathname === '/manifest') {
			// Hold the request until the initial compile finishes so the dev
			// worker's first page loads block (slow but correct) instead of
			// erroring with a 500 while content is still compiling.
			const deadline = Date.now() + 5 * 60_000
			for (;;) {
				try {
					const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'))
					res.writeHead(200, {
						'content-type': 'application/json',
						'cache-control': 'no-store',
					})
					res.end(JSON.stringify(manifest))
					return
				} catch (error: unknown) {
					if (Date.now() > deadline) {
						const message =
							error instanceof Error ? error.message : String(error)
						res.writeHead(503, { 'content-type': 'application/json' })
						res.end(JSON.stringify({ error: message }))
						return
					}
					await new Promise((resolve) => setTimeout(resolve, 500))
				}
			}
		}

		if (req.method === 'POST' && url.pathname === '/__dev/capture-email') {
			const chunks: Array<Buffer> = []
			for await (const chunk of req) {
				chunks.push(Buffer.from(chunk))
			}
			const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<
				string,
				string
			>
			let fixture: Record<string, unknown> = {}
			try {
				fixture = JSON.parse(await fs.readFile(MSW_DATA_PATH, 'utf8'))
			} catch {
				fixture = {}
			}
			if (body.to) {
				const email = fixture.email
				const emailRecord =
					email && typeof email === 'object'
						? (email as Record<string, unknown>)
						: {}
				await fs.writeFile(
					MSW_DATA_PATH,
					JSON.stringify(
						{
							...fixture,
							email: {
								...emailRecord,
								[body.to]: body,
							},
						},
						null,
						2,
					),
				)
			}
			res.writeHead(204)
			res.end()
			return
		}

		res.writeHead(404)
		res.end('Not Found')
	})

	await new Promise<void>((resolve, reject) => {
		server.listen(SIDECAR_PORT, '127.0.0.1', () => resolve())
		server.on('error', reject)
	})

	console.info(`mdx-dev sidecar listening on http://127.0.0.1:${SIDECAR_PORT}`)
	return server
}

async function main() {
	const startedAt = Date.now()
	await startSidecarServer()
	await compileAllDocuments({ concurrency: 4 })

	const contentDir = path.join(process.cwd(), 'content')
	const watcher = chokidar.watch(contentDir, {
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 200,
			pollInterval: 100,
		},
	})

	let recompileQueue = Promise.resolve()
	const queueRecompile = (key: string) => {
		recompileQueue = recompileQueue
			.then(() => recompileDocumentKey(key))
			.catch((error: unknown) => {
				console.error(`mdx-dev: failed to recompile ${key}`, error)
			})
	}

	watcher.on('add', (filePath) => {
		const key = contentPathToDocumentKey(filePath)
		if (key) queueRecompile(key)
	})
	watcher.on('change', (filePath) => {
		const key = contentPathToDocumentKey(filePath)
		if (key) queueRecompile(key)
	})

	console.info(`mdx-dev: ready in ${Date.now() - startedAt}ms`)
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
