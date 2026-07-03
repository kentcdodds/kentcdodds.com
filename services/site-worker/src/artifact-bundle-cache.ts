import {
	buildDynamicWorkerModuleMap,
	type MdxArtifactBundle,
	type WorkerLoaderModuleMap,
} from './module-map.ts'

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

export function cacheArtifactBundle(version: string, bundle: MdxArtifactBundle) {
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
