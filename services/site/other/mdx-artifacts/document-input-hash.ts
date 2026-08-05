import { createHash } from 'node:crypto'
import { ARTIFACT_COMPILER_VERSION } from './content-version.ts'
import {
	readLocalMdxFiles,
	readLocalMdxParentDirList,
	type MdxDocumentRef,
} from './local-content.ts'

/**
 * Hash of everything that determines a single document's compiled output:
 * the compiler version, the document's own files, and the parent directory
 * listing (which feeds GitHub path resolvability). Shared by the dev watcher
 * and the production compiler so both reuse caches on the same terms.
 */
export async function computeDocumentInputHash(document: MdxDocumentRef) {
	const [download, parentDirList] = await Promise.all([
		readLocalMdxFiles(document.contentDir, document.slug),
		readLocalMdxParentDirList(document.contentDir),
	])
	if (!download) {
		throw new Error(`Missing local MDX content for ${document.key}`)
	}

	const hash = createHash('sha256')
	hash.update(`compiler:${ARTIFACT_COMPILER_VERSION}`)
	hash.update('\0')
	hash.update(document.key)
	hash.update('\0')
	hash.update(download.entry)
	hash.update('\0')
	for (const file of [...download.files].sort((a, b) =>
		a.path.localeCompare(b.path),
	)) {
		hash.update(file.path)
		hash.update('\0')
		hash.update(file.content)
		hash.update('\0')
	}
	for (const entry of [...parentDirList].sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		hash.update(entry.name)
		hash.update('\0')
		hash.update(entry.type)
		hash.update('\0')
	}
	return hash.digest('hex')
}
