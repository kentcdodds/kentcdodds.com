import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const VIRTUAL_ID = 'virtual:mdx-dev-manifest'
const RESOLVED_ID = '\0' + VIRTUAL_ID

export type MdxDevManifestModule = {
	schemaVersion: 1
	version: string
	generatedAt: string
	documents: Record<
		string,
		{
			contentDir: string
			slug: string
			code: string
			[key: string]: unknown
		}
	>
	blogList: Array<unknown>
	dirLists: {
		blog: Array<unknown>
		pages: Array<unknown>
	}
	dataFiles: Record<string, string>
	modulesDir: string
	moduleMtimes: Record<string, number>
}

function getPaths(root: string) {
	const cacheRoot = path.join(root, 'node_modules/.cache/mdx-dev')
	return {
		cacheRoot,
		manifestPath: path.join(cacheRoot, 'manifest.json'),
		modulesDir: path.join(cacheRoot, 'modules'),
	}
}

function readManifestModule(root: string): MdxDevManifestModule {
	const { manifestPath, modulesDir } = getPaths(root)
	if (!fs.existsSync(manifestPath)) {
		throw new Error(
			`MDX dev manifest missing at ${manifestPath}. Is the mdx dev-watcher running?`,
		)
	}
	const manifest = JSON.parse(
		fs.readFileSync(manifestPath, 'utf8'),
	) as Omit<MdxDevManifestModule, 'modulesDir' | 'moduleMtimes'>
	const moduleMtimes: Record<string, number> = {}
	for (const key of Object.keys(manifest.documents)) {
		const document = manifest.documents[key]
		if (!document) continue
		const modulePath = path.join(
			modulesDir,
			document.contentDir,
			`${document.slug}.mjs`,
		)
		try {
			moduleMtimes[key] = fs.statSync(modulePath).mtimeMs
		} catch {
			moduleMtimes[key] = Date.now()
		}
	}
	return {
		...manifest,
		modulesDir,
		moduleMtimes,
	}
}

function watchMdxDevArtifacts(server: ViteDevServer, root: string) {
	const { cacheRoot, manifestPath, modulesDir } = getPaths(root)
	const watched = new Set<string>()

	const addWatch = (filePath: string) => {
		if (watched.has(filePath)) return
		watched.add(filePath)
		server.watcher.add(filePath)
	}

	addWatch(manifestPath)
	if (fs.existsSync(modulesDir)) {
		for (const dir of ['blog', 'pages'] as const) {
			const contentDir = path.join(modulesDir, dir)
			if (!fs.existsSync(contentDir)) continue
			for (const entry of fs.readdirSync(contentDir)) {
				addWatch(path.join(contentDir, entry))
			}
		}
	}

	const invalidate = () => {
		const module = server.moduleGraph.getModuleById(RESOLVED_ID)
		if (module) {
			server.moduleGraph.invalidateModule(module)
		}
		server.ws.send({ type: 'full-reload', path: '*' })
	}

	server.watcher.on('add', (filePath) => {
		if (filePath.startsWith(cacheRoot)) invalidate()
	})
	server.watcher.on('change', (filePath) => {
		if (filePath.startsWith(cacheRoot)) invalidate()
	})
	server.watcher.on('unlink', (filePath) => {
		if (filePath.startsWith(cacheRoot)) invalidate()
	})
}

export function mdxDevManifestPlugin(): Plugin {
	let root = process.cwd()

	return {
		name: 'mdx-dev-manifest',
		enforce: 'pre',
		configResolved(config) {
			root = config.root
		},
		configureServer(server) {
			watchMdxDevArtifacts(server, root)
		},
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID
		},
		load(id) {
			if (id !== RESOLVED_ID) return null
			const manifest = readManifestModule(root)
			this.addWatchFile(getPaths(root).manifestPath)
			return `export default ${JSON.stringify(manifest)}`
		},
	}
}
