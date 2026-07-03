import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'
import { compileMdx } from '#app/utils/compile-mdx.server.ts'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../site')

export async function readMdxBundleFiles(contentDir: string, slug: string) {
	const baseDir =
		contentDir === 'pages'
			? path.join(siteRoot, 'content/pages')
			: path.join(siteRoot, 'content/blog')

	const candidates =
		contentDir === 'pages'
			? [path.join(baseDir, `${slug}.mdx`)]
			: [
					path.join(baseDir, slug, 'index.mdx'),
					path.join(baseDir, `${slug}.mdx`),
				]

	let entryPath: string | null = null
	for (const candidate of candidates) {
		try {
			await readFile(candidate)
			entryPath = candidate
			break
		} catch {
			// try next
		}
	}
	if (!entryPath) {
		throw new Error(`Could not find MDX entry for ${contentDir}/${slug}`)
	}

	const files: Array<{ path: string; content: string }> = []
	const normalizedEntry = entryPath.replace(/\\/g, '/')
	const isDirectoryPost = normalizedEntry.endsWith(`/${slug}/index.mdx`)
	if (isDirectoryPost) {
		const rootDir = path.dirname(entryPath)
		async function walk(dir: string, relativePrefix = '') {
			const entries = await readdir(dir, { withFileTypes: true })
			for (const entry of entries) {
				if (entry.name.startsWith('.')) continue
				const absolute = path.join(dir, entry.name)
				const relative = path.posix.join(relativePrefix, entry.name)
				if (entry.isDirectory()) {
					await walk(absolute, relative)
					continue
				}
				if (!/\.(mdx|md|jsx|js|tsx|ts)$/i.test(entry.name)) continue
				files.push({
					path: `./${slug}/${relative}`,
					content: await readFile(absolute, 'utf8'),
				})
			}
		}
		await walk(rootDir)
	} else {
		files.push({
			path: `./${slug}/index.mdx`,
			content: await readFile(entryPath, 'utf8'),
		})
	}

	return { entryPath, files }
}

export async function compileServerEsm(code: string) {
	const esmSource = `import * as React from 'react';\nimport * as _jsx_runtime from 'react/jsx-runtime';\nconst MDXContent = (() => {\n${code}\n})();\nexport default MDXContent;\n`
	const result = await esbuild.build({
		stdin: { contents: esmSource, loader: 'js' },
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		write: false,
		external: ['react', 'react/jsx-runtime'],
	})
	return result.outputFiles[0]?.text ?? ''
}

export async function compileDocument(contentDir: string, slug: string) {
	const { files } = await readMdxBundleFiles(contentDir, slug)
	const compiled = await compileMdx(slug, files)
	if (!compiled) throw new Error(`compileMdx returned null for ${slug}`)
	const esm = await compileServerEsm(compiled.code)
	return { compiled, esm, files }
}

const [contentDirArg, slugArg] = process.argv.slice(2)

if (contentDirArg && slugArg) {
	const contentDir = contentDirArg
	const slug = slugArg
	const harnessDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
	const outDir = path.resolve(harnessDir, 'artifacts/mdx-modules', contentDir)
	const metaDir = path.resolve(harnessDir, 'artifacts/doc-meta')
	await mkdir(outDir, { recursive: true })
	await mkdir(metaDir, { recursive: true })
	const { compiled, esm } = await compileDocument(contentDir, slug)
	await writeFile(path.join(outDir, `${slug}.js`), esm)
	await writeFile(
		path.join(metaDir, `${contentDir}__${slug}.json`),
		JSON.stringify({
			code: compiled.code,
			frontmatter: compiled.frontmatter,
			readTime: compiled.readTime,
		}),
	)
	console.log(
		JSON.stringify({
			slug,
			codeLength: compiled.code.length,
			esmLength: esm.length,
		}),
	)
}
