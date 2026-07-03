/**
 * Harness-only artifact compiler. Produces the artifact JSON + per-document ESM
 * modules under scripts/dev-harness/artifacts/. Replaced by the real MDX
 * pipeline at integration.
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as YAML from 'yaml'
import calculateReadingTime from 'reading-time'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const harnessDir = __dirname
const siteRoot = path.resolve(__dirname, '../../../site')
const artifactsDir = path.resolve(harnessDir, 'artifacts')
const mdxOutDir = path.resolve(artifactsDir, 'mdx-modules')
const compileDocScript = path.join(__dirname, 'compile-doc.mts')

const harnessDocuments = [
	{ contentDir: 'blog', slug: 'super-simple-start-to-remix' },
	{ contentDir: 'blog', slug: 'helping-you-ask-me-questions-with-ai' },
	{
		contentDir: 'blog',
		slug: 'state-colocation-will-make-your-react-app-faster',
	},
	{ contentDir: 'pages', slug: 'uses' },
]

function runViteNode(args) {
	return new Promise((resolve, reject) => {
		const child = spawn(
			'npx',
			['vite-node', '--config', 'vite.config.ts', compileDocScript, ...args],
			{
				cwd: siteRoot,
				env: {
					...process.env,
					MOCKS: 'true',
					NODE_ENV: 'development',
					DATABASE_URL: 'file:./prisma/sqlite.db',
				},
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		)
		let stdout = ''
		let stderr = ''
		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString()
		})
		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString()
		})
		child.on('close', (code) => {
			if (code === 0) resolve(stdout.trim())
			else reject(new Error(stderr || stdout || `compile-doc failed: ${code}`))
		})
	})
}

function parseYamlFrontmatter(source) {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)
	if (!match) return {}
	try {
		return YAML.parse(match[1] ?? '') ?? {}
	} catch {
		return {}
	}
}

async function getBlogListItems() {
	const blogDir = path.join(siteRoot, 'content/blog')
	const entries = await readdir(blogDir, { withFileTypes: true })
	const items = []
	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue
		let filePath = null
		let slug = null
		if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
			slug = entry.name.replace(/\.mdx?$/i, '')
			filePath = path.join(blogDir, entry.name)
		} else if (entry.isDirectory()) {
			slug = entry.name
			const candidate = path.join(blogDir, slug, 'index.mdx')
			try {
				await readFile(candidate)
				filePath = candidate
			} catch {
				continue
			}
		}
		if (!slug || !filePath) continue
		const source = await readFile(filePath, 'utf8')
		const frontmatter = parseYamlFrontmatter(source)
		if (frontmatter.draft || frontmatter.unlisted) continue
		items.push({
			slug,
			editLink: `https://github.com/kentcdodds/kentcdodds.com/edit/main/services/site/content/blog/${slug}`,
			readTime: calculateReadingTime(source),
			frontmatter,
		})
	}
	return items.sort((a, b) => {
		const aTime = new Date(a.frontmatter.date ?? '').getTime()
		const bTime = new Date(b.frontmatter.date ?? '').getTime()
		return bTime - aTime
	})
}

async function readDataFiles() {
	const dataDir = path.join(siteRoot, 'content/data')
	const names = [
		'testimonials.yml',
		'talks.yml',
		'resume.yml',
		'credits.yml',
	]
	const dataFiles = {}
	for (const name of names) {
		dataFiles[`data/${name}`] = await readFile(path.join(dataDir, name), 'utf8')
	}
	return dataFiles
}

async function main() {
	await mkdir(path.join(artifactsDir, 'doc-meta'), { recursive: true })
	await mkdir(mdxOutDir, { recursive: true })

	const documents = {}
	const dirLists = { blog: [], pages: [] }

	for (const { contentDir, slug } of harnessDocuments) {
		const output = await runViteNode([contentDir, slug])
		const parsed = JSON.parse(output.split('\n').at(-1) ?? '{}')
		const metaPath = path.join(artifactsDir, 'doc-meta', `${contentDir}__${slug}.json`)
		const meta = JSON.parse(await readFile(metaPath, 'utf8'))
		const esm = await readFile(
			path.join(mdxOutDir, contentDir, `${slug}.js`),
			'utf8',
		)

		documents[`${contentDir}/${slug}`] = {
			contentDir,
			slug,
			code: meta.code,
			frontmatter: meta.frontmatter,
			readTime: meta.readTime,
		}
		dirLists[contentDir]?.push({ name: slug, slug })
		void parsed
		void esm
	}

	const blogList = await getBlogListItems()
	const dataFiles = await readDataFiles()
	const contentData = {
		schemaVersion: 1,
		version: `harness-${Date.now()}`,
		generatedAt: new Date().toISOString(),
		documents,
		blogList,
		dirLists,
		dataFiles,
	}

	await writeFile(
		path.join(artifactsDir, 'site-content-data.js'),
		`export default ${JSON.stringify(contentData)}`,
	)
	console.log('Harness artifacts compiled to', artifactsDir)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
