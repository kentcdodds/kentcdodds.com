import fs from 'node:fs/promises'
import path from 'node:path'
import { type MdxArtifactDocument } from '../../types/mdx-artifacts.ts'

/**
 * Persistent per-document compile cache for the production MDX compiler.
 * Each document is stored as documents/{contentDir}/{slug}.json alongside the
 * input hash that produced it (see document-input-hash.ts). Unchanged
 * documents are reused instead of recompiled — including their baked-in
 * resolved embeds — which is what makes warm deploy compiles fast.
 */
type CachedCompiledDocument = {
	inputHash: string
	document: MdxArtifactDocument
}

function documentCachePath(cacheDir: string, key: string) {
	return path.join(cacheDir, 'documents', `${key}.json`)
}

export async function readCachedCompiledDocument({
	cacheDir,
	key,
	inputHash,
}: {
	cacheDir: string
	key: string
	inputHash: string
}): Promise<MdxArtifactDocument | null> {
	let stored: CachedCompiledDocument | null
	try {
		stored = JSON.parse(
			await fs.readFile(documentCachePath(cacheDir, key), 'utf8'),
		) as CachedCompiledDocument | null
	} catch {
		return null
	}
	if (!stored || stored.inputHash !== inputHash) return null
	const document = stored.document
	if (
		!document ||
		typeof document.code !== 'string' ||
		typeof document.esm !== 'string' ||
		typeof document.slug !== 'string'
	) {
		return null
	}
	return document
}

export async function writeCachedCompiledDocument({
	cacheDir,
	key,
	inputHash,
	document,
}: {
	cacheDir: string
	key: string
	inputHash: string
	document: MdxArtifactDocument
}) {
	const filePath = documentCachePath(cacheDir, key)
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	const stored: CachedCompiledDocument = { inputHash, document }
	const tempPath = `${filePath}.${process.pid}.tmp`
	await fs.writeFile(tempPath, JSON.stringify(stored), 'utf8')
	await fs.rename(tempPath, filePath)
}

/** Remove cached documents whose keys no longer exist (deleted posts). */
export async function pruneCompiledDocumentCache({
	cacheDir,
	validKeys,
}: {
	cacheDir: string
	validKeys: Array<string>
}) {
	const documentsDir = path.join(cacheDir, 'documents')
	const valid = new Set(validKeys)
	let contentDirs: Array<string>
	try {
		contentDirs = await fs.readdir(documentsDir)
	} catch {
		return
	}
	for (const contentDir of contentDirs) {
		let fileNames: Array<string>
		try {
			fileNames = await fs.readdir(path.join(documentsDir, contentDir))
		} catch {
			continue
		}
		for (const fileName of fileNames) {
			if (!fileName.endsWith('.json')) continue
			const key = `${contentDir}/${fileName.slice(0, -'.json'.length)}`
			if (valid.has(key)) continue
			await fs.rm(path.join(documentsDir, contentDir, fileName), {
				force: true,
			})
		}
	}
}
