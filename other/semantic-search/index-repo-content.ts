import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chunkTextRaw, makeSnippet, sha256 } from './chunk-utils.ts'
import { getCloudflareConfig, getEmbeddings, vectorizeDeleteByIds, vectorizeUpsert } from './cloudflare.ts'
import { getJsonObject, putJsonObject } from './r2-manifest.ts'

type DocType = 'blog' | 'page'

type ManifestChunk = {
	id: string
	hash: string
	snippet: string
	chunkIndex: number
	chunkCount: number
}

type ManifestDoc = {
	type: DocType
	url: string
	title: string
	chunks: ManifestChunk[]
}

type Manifest = {
	version: 1
	docs: Record<string, ManifestDoc>
}

function parseArgs() {
	const args = process.argv.slice(2)
	const get = (name: string) => {
		const i = args.indexOf(name)
		return i >= 0 ? args[i + 1] : undefined
	}
	return {
		before: get('--before'),
		after: get('--after'),
		manifestKey: get('--manifest-key') ?? 'manifests/repo-content.json',
		only: get('--only') ?? process.env.SEMANTIC_SEARCH_ONLY,
	}
}

function isAllZerosSha(sha: string | undefined) {
	return typeof sha === 'string' && /^0+$/.test(sha)
}

function getDocId(type: DocType, slug: string) {
	return `${type}:${slug}`
}

function getVectorId(type: DocType, slug: string, chunkIndex: number) {
	return `${type}:${slug}:chunk:${chunkIndex}`
}

function getUrlForDoc(type: DocType, slug: string) {
	return type === 'blog' ? `/blog/${slug}` : `/${slug}`
}

function getTitleFromMdxSource(source: string) {
	// If there’s frontmatter, prefer its title; otherwise fall back to null.
	const fmMatch = source.match(/^---\n([\s\S]*?)\n---\n/)
	if (!fmMatch) return null
	const fm = fmMatch[1] ?? ''
	const titleMatch = fm.match(/^\s*title:\s*(?<value>.+?)\s*$/m)
	const value = titleMatch?.groups?.value
	if (!value) return null
	return value.replace(/^["']|["']$/g, '').trim() || null
}

async function readMdxDoc(type: DocType, slug: string) {
	if (type === 'blog') {
		// Blog posts can be either:
		// - content/blog/<slug>/index.mdx
		// - content/blog/<slug>.mdx
		const dirFilename = path.join('content', 'blog', slug, 'index.mdx')
		try {
			const source = await fs.readFile(dirFilename, 'utf8')
			return { filename: dirFilename, source }
		} catch (e: any) {
			if (e?.code !== 'ENOENT' && e?.code !== 'ENOTDIR') throw e
		}
		const fileFilename = path.join('content', 'blog', `${slug}.mdx`)
		const source = await fs.readFile(fileFilename, 'utf8')
		return { filename: fileFilename, source }
	}
	const filename = path.join('content', 'pages', `${slug}.mdx`)
	const source = await fs.readFile(filename, 'utf8')
	return { filename, source }
}

function getSlugFromContentPath(filePath: string): { type: DocType; slug: string } | null {
	const parts = filePath.replace(/\\/g, '/').split('/')
	const [contentDir, typeDir] = parts
	if (contentDir !== 'content') return null
	if (typeDir === 'blog') {
		// content/blog/<slug>/...
		// content/blog/<slug>.mdx
		const segment = parts[2]
		if (!segment) return null
		const slug = segment.replace(/\.mdx$/, '')
		return { type: 'blog', slug }
	}
	if (typeDir === 'pages') {
		// content/pages/<slug>.mdx
		const filename = parts[2]
		if (!filename) return null
		const slug = filename.replace(/\.mdx$/, '')
		return { type: 'page', slug }
	}
	return null
}

function getChangedFiles(before: string, after: string) {
	const output = execSync(`git diff --name-status ${before} ${after} -- content/blog content/pages`).toString()
	const lines = output.split('\n').filter(Boolean)
	const addedOrModified = new Set<string>()
	const deleted = new Set<string>()

	for (const line of lines) {
		const [status, a, b] = line.split('\t')
		if (!status) continue
		if (status.startsWith('R') && a && b) {
			deleted.add(a)
			addedOrModified.add(b)
			continue
		}
		if ((status === 'A' || status === 'M') && a) {
			addedOrModified.add(a)
			continue
		}
		if (status === 'D' && a) {
			deleted.add(a)
			continue
		}
	}

	return { addedOrModified: [...addedOrModified], deleted: [...deleted] }
}

function uniqDocsFromPaths(paths: string[]) {
	const docs = new Map<string, { type: DocType; slug: string }>()
	for (const p of paths) {
		const doc = getSlugFromContentPath(p)
		if (!doc) continue
		docs.set(getDocId(doc.type, doc.slug), doc)
	}
	return [...docs.values()]
}

function batch<T>(items: T[], size: number) {
	const result: T[][] = []
	for (let i = 0; i < items.length; i += size) {
		result.push(items.slice(i, i + size))
	}
	return result
}

async function embedItemsSafely({
	accountId,
	apiToken,
	model,
	items,
}: {
	accountId: string
	apiToken: string
	model: string
	items: Array<{
		vectorId: string
		text: string
		metadata: Record<string, unknown>
	}>
}): Promise<Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>> {
	try {
		const embeddings = await getEmbeddings({
			accountId,
			apiToken,
			model,
			texts: items.map((b) => b.text),
		})
		return items.map((item, i) => ({
			id: item.vectorId,
			values: embeddings[i]!,
			metadata: item.metadata,
		}))
	} catch (e) {
		// If a batch fails (e.g. one input too large/invalid), split and retry to
		// isolate the bad input instead of failing the whole indexing run.
		if (items.length <= 1) {
			const item = items[0]
			console.error('Skipping vector due to embedding failure', {
				vectorId: item?.vectorId,
				textLength: item?.text?.length,
			})
			console.error(e)
			return []
		}
		const mid = Math.ceil(items.length / 2)
		const left = await embedItemsSafely({
			accountId,
			apiToken,
			model,
			items: items.slice(0, mid),
		})
		const right = await embedItemsSafely({
			accountId,
			apiToken,
			model,
			items: items.slice(mid),
		})
		return [...left, ...right]
	}
}

async function main() {
	const { before, after, manifestKey, only } = parseArgs()
	const { accountId, apiToken, vectorizeIndex, embeddingModel } = getCloudflareConfig()
	const r2Bucket = process.env.R2_BUCKET ?? 'kcd-semantic-search'

	const manifest =
		(await getJsonObject<Manifest>({ bucket: r2Bucket, key: manifestKey })) ?? {
			version: 1,
			docs: {},
		}

	let docsToIndex: Array<{ type: DocType; slug: string }> = []
	let docsToDelete: Array<{ type: DocType; slug: string }> = []

	if (only) {
		docsToIndex = only
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => {
				const [type, slug] = s.split(':')
				if ((type === 'blog' || type === 'page') && slug) {
					return { type: type as DocType, slug }
				}
				return null
			})
			.filter(Boolean) as Array<{ type: DocType; slug: string }>
		console.log(`Only indexing explicitly requested docs: ${only}`)
	} else if (!before || !after || isAllZerosSha(before)) {
		// Full index.
		const blogEntries = await fs.readdir(path.join('content', 'blog'), {
			withFileTypes: true,
		})
		docsToIndex = blogEntries
			.map((entry) => {
				if (entry.isDirectory()) {
					return { type: 'blog' as const, slug: entry.name }
				}
				if (entry.isFile() && entry.name.endsWith('.mdx')) {
					return {
						type: 'blog' as const,
						slug: entry.name.replace(/\.mdx$/, ''),
					}
				}
				return null
			})
			.filter(Boolean) as Array<{ type: DocType; slug: string }>
		const pageFiles = await fs.readdir(path.join('content', 'pages'))
		docsToIndex.push(
			...pageFiles
				.filter((f) => f.endsWith('.mdx'))
				.map((f) => ({ type: 'page' as const, slug: f.replace(/\.mdx$/, '') })),
		)
	} else {
		const changed = getChangedFiles(before, after)
		docsToIndex = uniqDocsFromPaths(changed.addedOrModified)
		docsToDelete = uniqDocsFromPaths(changed.deleted)
	}

	console.log(`Docs to index: ${docsToIndex.length}`)
	console.log(`Docs to delete: ${docsToDelete.length}`)

	const idsToDelete: string[] = []
	const toUpsert: Array<{
		vectorId: string
		text: string
		metadata: Record<string, unknown>
	}> = []

	// Handle deletions
	for (const { type, slug } of docsToDelete) {
		const docId = getDocId(type, slug)
		const old = manifest.docs[docId]
		if (!old) continue
		for (const chunk of old.chunks) idsToDelete.push(chunk.id)
		delete manifest.docs[docId]
	}

	// Handle updates/inserts
	for (const { type, slug } of docsToIndex) {
		const docId = getDocId(type, slug)
		const url = getUrlForDoc(type, slug)
		const { source } = await readMdxDoc(type, slug)
		const title = getTitleFromMdxSource(source) ?? slug

		// Index raw MDX (including frontmatter/JSX/markdown) as requested.
		// Use smaller chunks than plaintext since raw MDX/code can be token-dense.
		const chunkBodies = chunkTextRaw(source, {
			targetChars: 2500,
			overlapChars: 250,
			maxChunkChars: 3500,
		})
		const chunkCount = chunkBodies.length

		const chunks: ManifestChunk[] = []
		const oldChunksById = new Map(
			(manifest.docs[docId]?.chunks ?? []).map((c) => [c.id, c]),
		)

		for (let i = 0; i < chunkBodies.length; i++) {
			const chunkBody = chunkBodies[i] ?? ''
			const preamble = `Title: ${title}\nType: ${type}\nURL: ${url}\n\n`
			const chunkTextForEmbedding = `${preamble}${chunkBody}`
			const vectorId = getVectorId(type, slug, i)
			const contentHash = sha256(chunkTextForEmbedding)
			const snippet = makeSnippet(chunkBody)

			chunks.push({
				id: vectorId,
				hash: contentHash,
				snippet,
				chunkIndex: i,
				chunkCount,
			})

			const existing = oldChunksById.get(vectorId)
			if (existing?.hash === contentHash) continue

			toUpsert.push({
				vectorId,
				text: chunkTextForEmbedding,
				metadata: {
					type,
					url,
					title,
					snippet,
					chunkIndex: i,
					chunkCount,
					contentHash,
				},
			})
		}

		// Removed chunks
		for (const old of oldChunksById.values()) {
			if (!chunks.find((c) => c.id === old.id)) {
				idsToDelete.push(old.id)
			}
		}

		manifest.docs[docId] = { type, url, title, chunks }
	}

	// Deletes first (avoid stale chunks lingering for renamed content)
	for (const idBatch of batch(idsToDelete, 500)) {
		if (!idBatch.length) continue
		console.log(`Deleting ${idBatch.length} vectors...`)
		await vectorizeDeleteByIds({ accountId, apiToken, indexName: vectorizeIndex, ids: idBatch })
	}

	// Embed + upsert changed chunks
	console.log(`Vectors to upsert: ${toUpsert.length}`)
	const upsertVectors: Array<{
		id: string
		values: number[]
		metadata: Record<string, unknown>
	}> = []

	const embedBatches = batch(toUpsert, 50)
	for (let i = 0; i < embedBatches.length; i++) {
		const embedBatch = embedBatches[i]!
		console.log(`Embedding batch ${i + 1}/${embedBatches.length} (${embedBatch.length} items)`)
		const vectors = await embedItemsSafely({
			accountId,
			apiToken,
			model: embeddingModel,
			items: embedBatch,
		})
		console.log(
			`Embedded batch ${i + 1}/${embedBatches.length} -> ${vectors.length} vectors`,
		)
		upsertVectors.push(...vectors)
	}

	const upsertBatches = batch(upsertVectors, 200)
	for (let i = 0; i < upsertBatches.length; i++) {
		const vecBatch = upsertBatches[i]!
		if (!vecBatch.length) continue
		console.log(
			`Upserting batch ${i + 1}/${upsertBatches.length} (${vecBatch.length} vectors)`,
		)
		await vectorizeUpsert({ accountId, apiToken, indexName: vectorizeIndex, vectors: vecBatch })
	}

	await putJsonObject({ bucket: r2Bucket, key: manifestKey, value: manifest })
	console.log(`Updated manifest written to r2://${r2Bucket}/${manifestKey}`)
}

main().catch((e) => {
	console.error(e)
	process.exitCode = 1
})

