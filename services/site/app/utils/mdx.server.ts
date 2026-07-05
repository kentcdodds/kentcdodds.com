import { type Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type ComponentType } from 'react'
import pLimit from 'p-limit'
import calculateReadingTime from 'reading-time'
import * as YAML from 'yaml'
import { type MdxPage } from '#app/types.ts'
import { buildMediaUrl } from '#app/utils/media.ts'
import {
	getArtifactDirList,
	getContentData,
	getDocumentCode,
	getLoadMdxModule,
	type ContentArtifactDocument,
} from './content-artifacts.server.ts'
import { formatDate } from './misc.ts'
import { registerMdxComponentForCode } from './mdx-component-registry.ts'
import { markdownToHtmlUnwrapped, stripHtml } from './markdown.server.ts'
import { type Timings } from './timing.server.ts'

type CachifiedOptions = {
	forceFresh?: boolean | string
	request?: Request
	ttl?: number
	timings?: Timings
}

const localBlogListItemLimit = pLimit(8)

function parseYamlFrontmatter(source: string): Record<string, unknown> {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)
	if (!match) return {}
	const raw = match[1] ?? ''
	try {
		const parsed = YAML.parse(raw)
		return parsed && typeof parsed === 'object'
			? (parsed as Record<string, unknown>)
			: {}
	} catch {
		return {}
	}
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

function isReadmeMdxEntry(name: string) {
	return /^readme(?:\.mdx?)?$/i.test(name)
}

function toGitHubEditPath(filePath: string) {
	const relativePath = path
		.relative(process.cwd(), filePath)
		.replace(/\\/g, '/')
	return relativePath.startsWith('services/site/')
		? relativePath
		: `services/site/${relativePath}`
}

async function getLocalBlogMdxFiles() {
	const blogDir = path.join(process.cwd(), 'content', 'blog')
	let entries: Array<Dirent>
	try {
		entries = await fs.readdir(blogDir, { withFileTypes: true })
	} catch (error: unknown) {
		console.error('mdx: failed to read local blog content directory', error)
		return []
	}

	const files: Array<{ slug: string; filePath: string }> = []
	for (const entry of entries) {
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
			files.push({ slug, filePath: path.join(blogDir, name) })
			continue
		}

		if (entry.isDirectory()) {
			const slug = name
			if (!slug) continue
			const filePath = await firstExistingFile([
				path.join(blogDir, slug, 'index.mdx'),
				path.join(blogDir, slug, 'index.md'),
			])
			if (filePath) files.push({ slug, filePath })
		}
	}

	return files
}

async function getLocalBlogMdxListItem({
	slug,
	filePath,
}: {
	slug: string
	filePath: string
}): Promise<Omit<MdxPage, 'code'> | null> {
	const source = await fs.readFile(filePath, 'utf8')
	const frontmatter = parseYamlFrontmatter(source) as MdxPage['frontmatter']

	return {
		slug,
		editLink: `https://github.com/kentcdodds/kentcdodds.com/edit/main/${toGitHubEditPath(filePath)}`,
		readTime: calculateReadingTime(source),
		dateDisplay: frontmatter.date ? formatDate(frontmatter.date) : undefined,
		frontmatter,
	}
}

const workerMdxPageCache = new Map<string, MdxPage | null>()

function resolveMdxModuleComponent(mod: Record<string, unknown>) {
	const exported = mod.default
	if (typeof exported === 'function') {
		return exported as ComponentType<Record<string, unknown>>
	}
	if (
		exported &&
		typeof exported === 'object' &&
		'default' in exported &&
		typeof (exported as { default: unknown }).default === 'function'
	) {
		return (exported as { default: ComponentType<Record<string, unknown>> })
			.default
	}
	return null
}

async function getWorkerMdxPage({
	contentDir,
	slug,
}: {
	contentDir: string
	slug: string
}): Promise<MdxPage | null> {
	if (contentDir === 'blog' && isReadmeMdxEntry(slug)) return null

	const contentData = getContentData()
	if (!contentData) return null

	const cacheKey = `${contentData.version}:${contentDir}:${slug}`
	if (!import.meta.env.DEV && workerMdxPageCache.has(cacheKey)) {
		return workerMdxPageCache.get(cacheKey) ?? null
	}

	const doc = contentData.documents[`${contentDir}/${slug}`] as
		| ContentArtifactDocument
		| undefined
	if (!doc) {
		if (!import.meta.env.DEV) workerMdxPageCache.set(cacheKey, null)
		return null
	}

	if (doc.githubResolvable === false) {
		if (!import.meta.env.DEV) workerMdxPageCache.set(cacheKey, null)
		return null
	}

	const code = await getDocumentCode(contentDir, slug)
	if (!code) {
		if (!import.meta.env.DEV) workerMdxPageCache.set(cacheKey, null)
		return null
	}

	const page: MdxPage = {
		code,
		slug: doc.slug,
		editLink: `https://github.com/kentcdodds/kentcdodds.com/edit/main/services/site/content/${contentDir}/${slug}`,
		readTime: doc.readTime as MdxPage['readTime'],
		dateDisplay: doc.dateDisplay,
		frontmatter: doc.frontmatter as MdxPage['frontmatter'],
	}

	const loadMdx = getLoadMdxModule()
	if (loadMdx) {
		const mod = await loadMdx(contentDir, slug)
		const Component = mod ? resolveMdxModuleComponent(mod) : null
		if (Component) {
			registerMdxComponentForCode(page.code, { default: Component })
		}
	}

	if (!import.meta.env.DEV) {
		workerMdxPageCache.set(cacheKey, page)
	}
	return page
}

export async function getMdxPage(
	{
		contentDir,
		slug,
	}: {
		contentDir: string
		slug: string
	},
	_options: CachifiedOptions,
): Promise<MdxPage | null> {
	return getWorkerMdxPage({ contentDir, slug })
}

export async function getMdxPagesInDirectory(
	contentDir: string,
	_options: CachifiedOptions,
) {
	const contentData = getContentData()
	if (!contentData) return []
	const dirList = getArtifactDirList(contentData, contentDir)
	const pages = await Promise.all(
		dirList.map(({ slug }) => getWorkerMdxPage({ contentDir, slug })),
	)
	return pages.filter((page): page is MdxPage => page !== null)
}

export async function getMdxDirList(
	contentDir: string,
	_options?: CachifiedOptions,
) {
	const contentData = getContentData()
	return contentData ? getArtifactDirList(contentData, contentDir) : []
}

export async function getBlogMdxListItems(_options: CachifiedOptions) {
	return getContentData()?.blogList ?? []
}

type CompiledMdxBase = {
	code: string
	readTime?: ReturnType<typeof calculateReadingTime>
	frontmatter: MdxPage['frontmatter']
}

export async function enrichCompiledMdxPage({
	slug,
	entry,
	compiledPage,
}: {
	slug: string
	entry: string
	compiledPage: CompiledMdxBase
}): Promise<MdxPage> {
	const page = {
		...compiledPage,
		slug,
		editLink: `https://github.com/kentcdodds/kentcdodds.com/edit/main/${entry}`,
	}

	if (
		page.frontmatter.bannerCloudinaryId &&
		!page.frontmatter.bannerBlurDataUrl
	) {
		try {
			page.frontmatter.bannerBlurDataUrl = await getBlurDataUrl(
				page.frontmatter.bannerCloudinaryId,
			)
		} catch (error: unknown) {
			console.error(
				'oh no, there was an error getting the blur image data url',
				error,
			)
		}
	}
	if (page.frontmatter.bannerCredit) {
		const credit = await markdownToHtmlUnwrapped(page.frontmatter.bannerCredit)
		page.frontmatter.bannerCredit = credit
		const noHtml = await stripHtml(credit)
		if (!page.frontmatter.bannerAlt) {
			page.frontmatter.bannerAlt = noHtml.replace(/(photo|image)/i, '').trim()
		}
		if (!page.frontmatter.bannerTitle) {
			page.frontmatter.bannerTitle = noHtml
		}
	}

	return {
		dateDisplay: page.frontmatter.date
			? formatDate(page.frontmatter.date)
			: undefined,
		...page,
	}
}

export async function getLocalBlogMdxListItemsUncached() {
	const localFiles = await getLocalBlogMdxFiles()
	let pages = (
		await Promise.all(
			localFiles.map(({ slug, filePath }) =>
				localBlogListItemLimit(() =>
					getLocalBlogMdxListItem({ slug, filePath }),
				),
			),
		)
	)
		.filter((page): page is Omit<MdxPage, 'code'> => page !== null)
		.filter((p) => !p.frontmatter.draft && !p.frontmatter.unlisted)

	pages = pages.sort((a, z) => {
		const aTime = new Date(a.frontmatter.date ?? '').getTime()
		const zTime = new Date(z.frontmatter.date ?? '').getTime()
		return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
	})

	const readmeListItem = await getReadmeBlogListItem()
	if (readmeListItem) pages.push(readmeListItem)

	return pages
}

async function getReadmeBlogListItem(): Promise<Omit<MdxPage, 'code'> | null> {
	const filePath = path.join(process.cwd(), 'content', 'blog', 'README.md')
	try {
		const source = await fs.readFile(filePath, 'utf8')
		const frontmatter = parseYamlFrontmatter(source) as MdxPage['frontmatter']
		return {
			slug: 'README',
			editLink: `https://github.com/kentcdodds/kentcdodds.com/edit/main/${toGitHubEditPath(filePath)}`,
			readTime: calculateReadingTime(source),
			dateDisplay: frontmatter.date ? formatDate(frontmatter.date) : undefined,
			frontmatter,
		}
	} catch {
		return null
	}
}

function toMdxDirListEntry(
	filePath: string,
	slug: string,
): { name: string; slug: string; type: 'file' | 'dir' } {
	const normalized = filePath.replace(/\\/g, '/')
	const isDirectoryPost =
		normalized.endsWith('/index.mdx') || normalized.endsWith('/index.md')
	return {
		name: path.basename(filePath),
		slug,
		type: isDirectoryPost ? 'dir' : 'file',
	}
}

export async function getLocalMdxDirList(contentDir: 'blog' | 'pages') {
	if (contentDir === 'blog') {
		const localFiles = await getLocalBlogMdxFiles()
		return localFiles.map(({ slug, filePath }) =>
			toMdxDirListEntry(filePath, slug),
		)
	}

	const pagesDir = path.join(process.cwd(), 'content', 'pages')
	let entries: Array<Dirent>
	try {
		entries = await fs.readdir(pagesDir, { withFileTypes: true })
	} catch (error: unknown) {
		console.error('mdx: failed to read local pages content directory', error)
		return []
	}

	return entries
		.filter(
			(entry) =>
				entry.isFile() &&
				/\.(mdx|md)$/i.test(entry.name) &&
				!isReadmeMdxEntry(entry.name),
		)
		.map((entry) => ({
			name: entry.name,
			slug: entry.name.replace(/\.(mdx|md)$/i, ''),
			type: 'file' as const,
		}))
}

const MEDIA_ORIGIN =
	process.env.MEDIA_ORIGIN ?? 'https://kentcdodds-com.kentcdodds.workers.dev'

async function getBlurDataUrl(cloudinaryId: string) {
	const imageURL = buildMediaUrl(
		cloudinaryId,
		{ width: 100, blur: 100, format: 'webp' },
		{ origin: MEDIA_ORIGIN },
	)
	const dataUrl = await getDataUrlForImage(imageURL)
	return dataUrl
}

async function getDataUrlForImage(imageUrl: string) {
	const res = await fetch(imageUrl)
	const arrayBuffer = await res.arrayBuffer()
	const base64 = Buffer.from(arrayBuffer).toString('base64')
	const mime = res.headers.get('Content-Type') ?? 'image/webp'
	const dataUrl = `data:${mime};base64,${base64}`
	return dataUrl
}

export { isReadmeMdxEntry }
