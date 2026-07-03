import { type Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type GitHubFile } from '#app/types.ts'
import { GITHUB_CONTENT_PATH } from '#app/utils/github-content-paths.server.ts'

function isReadmeMdxEntry(name: string) {
	return /^readme(?:\.mdx?)?$/i.test(name)
}

const safePath = (filePath: string) => filePath.replace(/\\/g, '/')

export type MdxDocumentRef = {
	contentDir: 'blog' | 'pages'
	slug: string
	key: string
}

async function firstExistingFile(filePaths: Array<string>) {
	for (const filePath of filePaths) {
		try {
			const stats = await fs.stat(filePath)
			if (stats.isFile()) return filePath
		} catch {
			// try the next candidate
		}
	}
	return null
}

async function readDirectoryFiles(
	dirPath: string,
	githubDirPath: string,
): Promise<Array<GitHubFile>> {
	const entries = await fs.readdir(dirPath, { withFileTypes: true })
	const files: Array<GitHubFile> = []

	for (const entry of entries) {
		const localPath = path.join(dirPath, entry.name)
		const githubPath = safePath(path.join(githubDirPath, entry.name))
		if (entry.isFile()) {
			files.push({
				path: githubPath,
				content: await fs.readFile(localPath, 'utf8'),
			})
			continue
		}
		if (entry.isDirectory()) {
			files.push(...(await readDirectoryFiles(localPath, githubPath)))
		}
	}

	return files
}

export async function discoverLocalMdxDocuments(): Promise<
	Array<MdxDocumentRef>
> {
	const documents: Array<MdxDocumentRef> = []

	const blogDir = path.join(process.cwd(), 'content', 'blog')
	let blogEntries: Array<Dirent>
	try {
		blogEntries = await fs.readdir(blogDir, { withFileTypes: true })
	} catch (error: unknown) {
		console.error('mdx-artifacts: failed to read blog directory', error)
		blogEntries = []
	}

	for (const entry of blogEntries) {
		const name = entry.name
		if (
			!name ||
			name.startsWith('.') ||
			isReadmeMdxEntry(name) ||
			entry.isSymbolicLink()
		) {
			continue
		}

		if (entry.isFile() && /\.(mdx|md)$/i.test(name)) {
			const slug = name.replace(/\.(mdx|md)$/i, '')
			if (!slug) continue
			documents.push({
				contentDir: 'blog',
				slug,
				key: `blog/${slug}`,
			})
			continue
		}

		if (entry.isDirectory()) {
			const slug = name
			const filePath = await firstExistingFile([
				path.join(blogDir, slug, 'index.mdx'),
				path.join(blogDir, slug, 'index.md'),
			])
			if (filePath) {
				documents.push({
					contentDir: 'blog',
					slug,
					key: `blog/${slug}`,
				})
			}
		}
	}

	const pagesDir = path.join(process.cwd(), 'content', 'pages')
	let pageEntries: Array<Dirent>
	try {
		pageEntries = await fs.readdir(pagesDir, { withFileTypes: true })
	} catch (error: unknown) {
		console.error('mdx-artifacts: failed to read pages directory', error)
		pageEntries = []
	}

	for (const entry of pageEntries) {
		if (
			!entry.isFile() ||
			!/\.(mdx|md)$/i.test(entry.name) ||
			isReadmeMdxEntry(entry.name)
		) {
			continue
		}
		const slug = entry.name.replace(/\.(mdx|md)$/i, '')
		if (!slug) continue
		documents.push({
			contentDir: 'pages',
			slug,
			key: `pages/${slug}`,
		})
	}

	return documents.sort((a, b) => a.key.localeCompare(b.key))
}

export async function readLocalMdxFiles(
	contentDir: 'blog' | 'pages',
	slug: string,
): Promise<{ entry: string; files: Array<GitHubFile> } | null> {
	const contentRoot = path.join(process.cwd(), 'content', contentDir)
	const githubBase = `${GITHUB_CONTENT_PATH}/${contentDir}/${slug}`

	for (const ext of ['.mdx', '.md']) {
		const flatFilePath = path.join(contentRoot, `${slug}${ext}`)
		try {
			const stats = await fs.stat(flatFilePath)
			if (!stats.isFile()) continue
			const content = await fs.readFile(flatFilePath, 'utf8')
			return {
				entry: safePath(path.join(githubBase, path.basename(flatFilePath))),
				files: [
					{
						path: safePath(path.join(githubBase, 'index.mdx')),
						content,
					},
				],
			}
		} catch {
			// try the next candidate
		}
	}

	const dirPath = path.join(contentRoot, slug)
	try {
		const stats = await fs.stat(dirPath)
		if (!stats.isDirectory()) return null
		const files = await readDirectoryFiles(dirPath, githubBase)
		if (!files.length) return null
		return {
			entry: githubBase,
			files,
		}
	} catch {
		return null
	}
}

export type ContentInputFile = {
	path: string
	content: string
}

export async function collectContentInputFiles(): Promise<
	Array<ContentInputFile>
> {
	const inputs: Array<ContentInputFile> = []
	const documents = await discoverLocalMdxDocuments()

	for (const { contentDir, slug } of documents) {
		const download = await readLocalMdxFiles(contentDir, slug)
		if (!download) continue
		for (const file of download.files) {
			inputs.push({ path: file.path, content: file.content })
		}
	}

	const dataDir = path.join(process.cwd(), 'content', 'data')
	let dataEntries: Array<Dirent>
	try {
		dataEntries = await fs.readdir(dataDir, { withFileTypes: true })
	} catch {
		dataEntries = []
	}

	for (const entry of dataEntries) {
		if (!entry.isFile() || !entry.name.endsWith('.yml')) continue
		const localPath = path.join(dataDir, entry.name)
		const githubPath = safePath(
			path.join(GITHUB_CONTENT_PATH, 'data', entry.name),
		)
		inputs.push({
			path: githubPath,
			content: await fs.readFile(localPath, 'utf8'),
		})
	}

	return inputs.sort((a, b) => a.path.localeCompare(b.path))
}

export async function readLocalDataFiles(): Promise<Record<string, string>> {
	const dataDir = path.join(process.cwd(), 'content', 'data')
	const dataFiles: Record<string, string> = {}
	let dataEntries: Array<Dirent>
	try {
		dataEntries = await fs.readdir(dataDir, { withFileTypes: true })
	} catch {
		return dataFiles
	}

	for (const entry of dataEntries) {
		if (!entry.isFile() || !entry.name.endsWith('.yml')) continue
		const content = await fs.readFile(path.join(dataDir, entry.name), 'utf8')
		dataFiles[`data/${entry.name}`] = content
	}

	return dataFiles
}
