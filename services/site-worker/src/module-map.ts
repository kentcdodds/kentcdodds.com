import appWorkerSource from '../dist/app-worker.js.txt'
import reactJsxRuntimeShimSource from '../dist/react-jsx-runtime-shim.js.txt'
import reactShimSource from '../dist/react-shim.js.txt'

export type MdxArtifactDocument = {
	contentDir: string
	slug: string
	esm: string
	code?: string
	frontmatter?: unknown
	readTime?: unknown
	dateDisplay?: string
	bannerBlurDataUrl?: string
	bannerCredit?: string
}

export type MdxArtifactBundle = {
	schemaVersion: number
	version: string
	generatedAt: string
	documents: Record<string, MdxArtifactDocument>
	blogList: unknown[]
	dirLists: Record<string, unknown[]>
	dataFiles: Record<string, string>
}

type WorkerLoaderModule =
	| string
	| { js: string }
	| { json: unknown }
	| { wasm: Uint8Array }

export type WorkerLoaderModuleMap = Record<string, WorkerLoaderModule>

export function buildSiteContentData(bundle: MdxArtifactBundle) {
	const { documents, ...rest } = bundle
	const contentDocuments: Record<string, unknown> = {}

	for (const [key, document] of Object.entries(documents)) {
		const { esm: _esm, ...documentWithoutEsm } = document
		contentDocuments[key] = documentWithoutEsm
	}

	return { ...rest, documents: contentDocuments }
}

function addNestedReactShimAliases(
	modules: WorkerLoaderModuleMap,
	reactShim: string,
	jsxRuntimeShim: string,
) {
	const mdxPrefixes = new Set<string>()
	for (const name of Object.keys(modules)) {
		if (!name.startsWith('mdx/') || !name.endsWith('.js')) continue
		const slash = name.lastIndexOf('/')
		if (slash > 0) mdxPrefixes.add(`${name.slice(0, slash + 1)}`)
	}
	for (const prefix of mdxPrefixes) {
		modules[`${prefix}react`] = { js: reactShim }
		modules[`${prefix}react/jsx-runtime`] = { js: jsxRuntimeShim }
	}
}

export function buildDynamicWorkerModuleMap(
	bundle: MdxArtifactBundle,
): WorkerLoaderModuleMap {
	const modules: WorkerLoaderModuleMap = {
		'app-worker.js': appWorkerSource,
		react: { js: reactShimSource },
		'react/jsx-runtime': { js: reactJsxRuntimeShimSource },
		'site-content-data.json': { json: buildSiteContentData(bundle) },
	}

	for (const [documentKey, document] of Object.entries(bundle.documents)) {
		const moduleName = `mdx/${document.contentDir}/${document.slug}.js`
		if (modules[moduleName]) {
			throw new Error(
				`Duplicate MDX module name: ${moduleName} (${documentKey})`,
			)
		}
		modules[moduleName] = { js: document.esm }
	}

	addNestedReactShimAliases(modules, reactShimSource, reactJsxRuntimeShimSource)

	return modules
}

export function getDynamicWorkerId(buildSha: string, contentVersion: string) {
	return `app:${buildSha}:content:${contentVersion}`
}
