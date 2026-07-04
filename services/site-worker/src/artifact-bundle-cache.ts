import {
	buildDynamicWorkerModuleMap,
	type MdxArtifactBundle,
	type WorkerLoaderModuleMap,
} from './module-map.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'

const bundleByVersion = new Map<string, MdxArtifactBundle>()
const moduleMapByVersion = new Map<string, WorkerLoaderModuleMap>()

export function clearArtifactBundleCache() {
	bundleByVersion.clear()
	moduleMapByVersion.clear()
}

export function getCachedArtifactBundle(
	version: string,
): MdxArtifactBundle | undefined {
	return bundleByVersion.get(version)
}

export function cacheArtifactBundle(
	version: string,
	bundle: MdxArtifactBundle,
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
	bundle: MdxArtifactBundle,
): WorkerLoaderModuleMap {
	const cached = moduleMapByVersion.get(version)
	if (cached) return cached

	const moduleMap = buildDynamicWorkerModuleMap(bundle)
	moduleMapByVersion.set(version, moduleMap)
	return moduleMap
}

export function getDocumentCodeFromBundle(
	bundle: MdxArtifactBundle,
	contentDir: string,
	slug: string,
): string | null {
	const document = bundle.documents[`${contentDir}/${slug}`]
	return document?.code ?? null
}

export async function fetchArtifactBundle(
	env: Pick<ParentWorkerEnv, 'CONTENT_KV' | 'MDX_ARTIFACTS'>,
	r2Key: string,
): Promise<MdxArtifactBundle | null> {
	// KV mirror first: with cacheTtl the read is served from the local edge
	// cache (~10-30ms) instead of R2 (~300ms), which matters because parent
	// isolates rotate and each cold parent needs the bundle.
	try {
		const mirrored = await env.CONTENT_KV.get(`mdx-bundle:${r2Key}`, {
			type: 'json',
			cacheTtl: 300,
		})
		if (mirrored) return mirrored as MdxArtifactBundle
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
		await env.CONTENT_KV.put(`mdx-bundle:${r2Key}`, JSON.stringify(bundle))
	} catch {
		// KV values cap at 25 MiB; if the bundle ever outgrows that we still
		// serve from R2.
	}
	return bundle
}

export async function getOrFetchArtifactBundle(
	env: Pick<ParentWorkerEnv, 'CONTENT_KV' | 'MDX_ARTIFACTS'>,
	version: string,
	r2Key: string,
): Promise<MdxArtifactBundle | null> {
	const cached = getCachedArtifactBundle(version)
	if (cached) return cached
	const bundle = await fetchArtifactBundle(env, r2Key)
	if (bundle) cacheArtifactBundle(version, bundle)
	return bundle
}
