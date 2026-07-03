import appWorkerSource from '../dist/app-worker.js.txt'
import reactDomServerSource from '../dist/vendor/react-dom-server.js.txt'
import reactDomSource from '../dist/vendor/react-dom.js.txt'
import reactJsxDevRuntimeSource from '../dist/vendor/react-jsx-dev-runtime.js.txt'
import reactJsxRuntimeSource from '../dist/vendor/react-jsx-runtime.js.txt'
import reactSource from '../dist/vendor/react.js.txt'

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
	const contentData: Record<string, unknown> = { ...rest }

	for (const [key, document] of Object.entries(documents)) {
		const { esm: _esm, ...documentWithoutEsm } = document
		contentData[key] = documentWithoutEsm
	}

	return contentData
}

export function buildDynamicWorkerModuleMap(
	bundle: MdxArtifactBundle,
): WorkerLoaderModuleMap {
	const modules: WorkerLoaderModuleMap = {
		'app-worker.js': appWorkerSource,
		react: { js: reactSource },
		'react-dom': { js: reactDomSource },
		'react-dom/server': { js: reactDomServerSource },
		'react/jsx-runtime': { js: reactJsxRuntimeSource },
		'react/jsx-dev-runtime': { js: reactJsxDevRuntimeSource },
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

	return modules
}

export function getDynamicWorkerId(buildSha: string, contentVersion: string) {
	return `app:${buildSha}:content:${contentVersion}`
}
