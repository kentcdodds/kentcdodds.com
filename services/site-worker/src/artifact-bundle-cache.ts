import { LRUCache } from 'lru-cache'
import {
	getMdxBundleMirrorKey,
	getMdxCodeKey,
	writeArtifactBundleKvMirror,
	type MirroredMdxArtifactBundle,
} from './artifact-kv-mirror.ts'
import type { MdxManifest } from './manifest.ts'
import {
	buildDynamicWorkerModuleMap,
	type MdxArtifactBundle,
	type WorkerLoaderModuleMap,
} from './module-map.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'

const bundleByVersion = new Map<string, MirroredMdxArtifactBundle>()
const moduleMapByVersion = new Map<string, WorkerLoaderModuleMap>()
// Per-document client code fetched on demand (stripped-mirror path). Codes
// average ~36KB, so 100 entries bounds this around ~4MB of parent memory.
const documentCodeByVersionedKey = new LRUCache<string, string>({ max: 100 })

export function clearArtifactBundleCache() {
	bundleByVersion.clear()
	moduleMapByVersion.clear()
	documentCodeByVersionedKey.clear()
}

export function getCachedArtifactBundle(
	version: string,
): MirroredMdxArtifactBundle | undefined {
	return bundleByVersion.get(version)
}

export function cacheArtifactBundle(
	version: string,
	bundle: MirroredMdxArtifactBundle,
) {
	bundleByVersion.set(version, bundle)
}

export function getCachedModuleMap(
	version: string,
): WorkerLoaderModuleMap | undefined {
	return moduleMapByVersion.get(version)
}

export function getOrBuildModuleMap(
	version: string,
	bundle: MirroredMdxArtifactBundle,
): WorkerLoaderModuleMap {
	const cached = moduleMapByVersion.get(version)
	if (cached) return cached

	const moduleMap = buildDynamicWorkerModuleMap(bundle)
	moduleMapByVersion.set(version, moduleMap)
	return moduleMap
}

export function getDocumentCodeFromBundle(
	bundle: MirroredMdxArtifactBundle,
	contentDir: string,
	slug: string,
): string | null {
	const document = bundle.documents[`${contentDir}/${slug}`]
	return document?.code ?? null
}

export async function fetchArtifactBundle(
	env: Pick<ParentWorkerEnv, 'CONTENT_KV' | 'MDX_ARTIFACTS'>,
	r2Key: string,
): Promise<MirroredMdxArtifactBundle | null> {
	// KV mirror first: with cacheTtl the read is served from the local edge
	// cache (~10-30ms) instead of R2 (~300ms), which matters because parent
	// isolates rotate and each cold parent needs the bundle. The mirror is
	// either the current code-stripped copy or a legacy full bundle written
	// before the code split — both parse into the same shape (`code` is
	// optional), so the pre-split mirror keeps working after this deploys.
	try {
		const mirrored = await env.CONTENT_KV.get(getMdxBundleMirrorKey(r2Key), {
			type: 'json',
			cacheTtl: 300,
		})
		if (mirrored) return mirrored as MirroredMdxArtifactBundle
	} catch {
		// fall through to R2
	}

	const object = await env.MDX_ARTIFACTS.get(r2Key)
	if (!object) return null

	let bundle: MdxArtifactBundle
	try {
		bundle = (await object.json()) as MdxArtifactBundle
	} catch {
		return null
	}

	try {
		await writeArtifactBundleKvMirror(env.CONTENT_KV, r2Key, bundle)
	} catch {
		// If the mirror/code writes fail we still serve this request from R2,
		// and getDocumentCode falls back to R2 for missing code keys.
	}
	return bundle
}

export async function getOrFetchArtifactBundle(
	env: Pick<ParentWorkerEnv, 'CONTENT_KV' | 'MDX_ARTIFACTS'>,
	version: string,
	r2Key: string,
): Promise<MirroredMdxArtifactBundle | null> {
	const cached = getCachedArtifactBundle(version)
	if (cached) return cached
	const bundle = await fetchArtifactBundle(env, r2Key)
	if (bundle) cacheArtifactBundle(version, bundle)
	return bundle
}

export async function resolveDocumentCode(
	env: Pick<ParentWorkerEnv, 'CONTENT_KV' | 'MDX_ARTIFACTS'>,
	manifest: MdxManifest,
	contentDir: string,
	slug: string,
): Promise<string | null> {
	// Falls back to KV/R2 when the parent-memory cache is cold (e.g. right
	// after an artifact publish cleared it) so in-flight MDX requests keep
	// working.
	const bundle = await getOrFetchArtifactBundle(
		env,
		manifest.version,
		manifest.r2Key,
	)
	if (!bundle) return null

	const inlineCode = getDocumentCodeFromBundle(bundle, contentDir, slug)
	if (inlineCode !== null) return inlineCode
	// Unknown documents stay null; only stripped-but-present documents go
	// looking for their code elsewhere.
	if (!bundle.documents[`${contentDir}/${slug}`]) return null

	const memoryKey = `${manifest.version}:${contentDir}/${slug}`
	const cachedCode = documentCodeByVersionedKey.get(memoryKey)
	if (cachedCode !== undefined) return cachedCode

	try {
		const kvCode = await env.CONTENT_KV.get(
			getMdxCodeKey(manifest.version, contentDir, slug),
			{ cacheTtl: 300 },
		)
		if (kvCode !== null) {
			documentCodeByVersionedKey.set(memoryKey, kvCode)
			return kvCode
		}
	} catch {
		// fall through to R2
	}

	// Per-doc key missing (bundle published before the code split, or a
	// publish whose code writes failed/raced): read the full bundle straight
	// from R2 — not the mirror, which may be stripped — so in-flight MDX
	// requests keep working across deploy/publish races.
	const object = await env.MDX_ARTIFACTS.get(manifest.r2Key)
	if (!object) return null

	let fullBundle: MdxArtifactBundle
	try {
		fullBundle = (await object.json()) as MdxArtifactBundle
	} catch {
		return null
	}
	const code = getDocumentCodeFromBundle(fullBundle, contentDir, slug)
	if (code !== null) documentCodeByVersionedKey.set(memoryKey, code)
	return code
}
