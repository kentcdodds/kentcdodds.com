import type {
	MdxArtifactBundle,
	MdxArtifactDocument,
} from '../../site/types/mdx-artifacts.ts'

/**
 * KV-mirrored variant of the artifact bundle: per-document client `code` is
 * stripped from the mirror and stored under per-document `mdx-code:` keys so
 * cold parent isolates don't fetch + JSON.parse ~8MB of hydration code they
 * only need one document at a time. Legacy mirrors (written before this
 * split) still carry `code` inline, so it stays optional here.
 */
export type MirroredMdxArtifactDocument = Omit<MdxArtifactDocument, 'code'> & {
	code?: string
}

export type MirroredMdxArtifactBundle = Omit<MdxArtifactBundle, 'documents'> & {
	documents: Record<string, MirroredMdxArtifactDocument>
}

export function getMdxBundleMirrorKey(r2Key: string) {
	return `mdx-bundle:${r2Key}`
}

/**
 * Version-scoped so a republished bundle can never serve another version's
 * code, and so `cacheTtl` edge caching of these immutable values is safe.
 */
export function getMdxCodeKey(
	version: string,
	contentDir: string,
	slug: string,
) {
	return `mdx-code:${version}:${contentDir}/${slug}`
}

export function stripBundleDocumentCode(
	bundle: MirroredMdxArtifactBundle,
): MirroredMdxArtifactBundle {
	const documents: Record<string, MirroredMdxArtifactDocument> = {}
	for (const [key, document] of Object.entries(bundle.documents)) {
		const { code: _code, ...documentWithoutCode } = document
		documents[key] = documentWithoutCode
	}
	return { ...bundle, documents }
}

const CODE_PUT_BATCH_SIZE = 20

/**
 * Writes the per-document `mdx-code:` keys (bounded concurrency; ~227 docs)
 * and then the code-stripped bundle mirror. Code keys go first so a mirror —
 * and the manifest flipped after it — never points at a version whose code
 * keys are still being written.
 */
export async function writeArtifactBundleKvMirror(
	contentKv: { put(key: string, value: string): Promise<unknown> },
	r2Key: string,
	bundle: MirroredMdxArtifactBundle,
) {
	const codeEntries: Array<{ key: string; code: string }> = []
	for (const document of Object.values(bundle.documents)) {
		if (typeof document.code !== 'string') continue
		codeEntries.push({
			key: getMdxCodeKey(bundle.version, document.contentDir, document.slug),
			code: document.code,
		})
	}
	for (let i = 0; i < codeEntries.length; i += CODE_PUT_BATCH_SIZE) {
		await Promise.all(
			codeEntries
				.slice(i, i + CODE_PUT_BATCH_SIZE)
				.map((entry) => contentKv.put(entry.key, entry.code)),
		)
	}
	await contentKv.put(
		getMdxBundleMirrorKey(r2Key),
		JSON.stringify(stripBundleDocumentCode(bundle)),
	)
}
