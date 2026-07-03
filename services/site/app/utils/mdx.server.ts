import { type Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { buildImageUrl } from 'cloudinary-build-url'
import pLimit from 'p-limit'
import calculateReadingTime from 'reading-time'
import * as YAML from 'yaml'
import { type GitHubFile, type MdxPage } from '#app/types.ts'
import { compileMdx } from '#app/utils/compile-mdx.server.ts'
import { getGitHubContentPath } from '#app/utils/github-content-paths.server.ts'
import {
	downloadDirList,
	downloadMdxFileOrDirectory,
} from '#app/utils/github.server.ts'
import { formatDate, typedBoolean } from '#app/utils/misc.ts'
import { cache, cachified } from './cache.server.ts'
import { markdownToHtmlUnwrapped, stripHtml } from './markdown.server.ts'
import { type Timings } from './timing.server.ts'

type CachifiedOptions = {
	forceFresh?: boolean | string
	request?: Request
	ttl?: number
	timings?: Timings
}

const defaultTTL = 1000 * 60 * 60 * 24 * 14
const defaultStaleWhileRevalidate = 1000 * 60 * 60 * 24 * 365 * 100
const blogListTTL = defaultStaleWhileRevalidate
const notFoundTTL = 1000 * 60 * 60 * 24
const notFoundStaleWhileRevalidate = 0
const localBlogListItemLimit = pLimit(8)
const downloadMdxFileLimit = pLimit(4)

/** Spread SWR background refreshes so many stale keys don't hit the compile queue at once. */
function staleRefreshJitterMs(key: string): number {
	let h = 0
	for (let i = 0; i < key.length; i++) {
		h = Math.imul(31, h) + key.charCodeAt(i)
	}
	return Math.abs(h) % 2500
}

function applyNotFoundCacheMetadata(
	metadata: { ttl?: number | null; swr?: number | null },
	maxTtl: number | null | undefined,
) {
	// Cache negative lookups briefly to avoid hammering GitHub for repeated 404s,
	// but don't keep them around for long (and never serve them stale).
	const effectiveMaxTtl = typeof maxTtl === 'number' ? maxTtl : Infinity
	metadata.ttl = Math.min(effectiveMaxTtl, notFoundTTL)
	metadata.swr = notFoundStaleWhileRevalidate
}

const checkCompiledValue = (value: unknown) =>
	typeof value === 'object' &&
	(value === null || ('code' in value && 'frontmatter' in value))

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

export async function getMdxPage(
	{
		contentDir,
		slug,
	}: {
		contentDir: string
		slug: string
	},
	options: CachifiedOptions,
): Promise<MdxPage | null> {
	if (contentDir === 'blog' && isReadmeMdxEntry(slug)) return null

	const { forceFresh, ttl = defaultTTL, request, timings } = options
	const key = `mdx-page:${contentDir}:${slug}:compiled`
	try {
		const page = await cachified({
			key,
			cache,
			request,
			timings,
			ttl,
			staleWhileRevalidate: defaultStaleWhileRevalidate,
			staleRefreshTimeout: staleRefreshJitterMs(key),
			forceFresh,
			checkValue: checkCompiledValue,
			getFreshValue: async (context) => {
				const pageFiles = await downloadMdxFilesCached(
					contentDir,
					slug,
					options,
				)
				const compiledPage = await compileMdxCached({
					contentDir,
					slug,
					...pageFiles,
					options,
				}).catch((err) => {
					console.error(`Failed to get a fresh value for mdx:`, {
						contentDir,
						slug,
					})
					return Promise.reject(err)
				})
				if (!compiledPage) {
					applyNotFoundCacheMetadata(context.metadata, ttl)
				}
				return compiledPage
			},
		})
		return page
	} catch (error: unknown) {
		console.error(
			`mdx: failed to load page ${contentDir}/${slug}, returning null`,
			error,
		)
		return null
	}
}

export async function getMdxPagesInDirectory(
	contentDir: string,
	options: CachifiedOptions,
) {
	const dirList = await getMdxDirList(contentDir, options)

	// our octokit throttle plugin will make sure we don't hit the rate limit
	const pageDatas = await Promise.all(
		dirList.map(async ({ slug }) => {
			return {
				...(await downloadMdxFilesCached(contentDir, slug, options)),
				slug,
			}
		}),
	)

	const pages = await Promise.all(
		pageDatas.map((pageData) =>
			compileMdxCached({ contentDir, ...pageData, options }),
		),
	)
	return pages.filter(typedBoolean)
}

const getDirListKey = (contentDir: string) => `${contentDir}:dir-list`

export async function getMdxDirList(
	contentDir: string,
	options?: CachifiedOptions,
) {
	const { forceFresh, ttl = defaultTTL, request, timings } = options ?? {}
	const key = getDirListKey(contentDir)
	return cachified({
		cache,
		request,
		timings,
		ttl,
		staleWhileRevalidate: defaultStaleWhileRevalidate,
		staleRefreshTimeout: staleRefreshJitterMs(key),
		forceFresh,
		key,
		checkValue: (value: unknown) => Array.isArray(value),
		getFreshValue: async () => {
			try {
				const fullContentDirPath = getGitHubContentPath(contentDir)
				const dirList = (await downloadDirList(fullContentDirPath))
					.map(({ name, path }) => ({
						name,
						slug: path
							.replace(/\\/g, '/')
							.replace(`${fullContentDirPath}/`, '')
							.replace(/\.mdx$/, ''),
					}))
					.filter(({ name }) => !isReadmeMdxEntry(name))
				return dirList
			} catch (error: unknown) {
				console.error(
					`mdx: failed to fetch GitHub dir list for ${contentDir}, returning empty`,
					error,
				)
				return []
			}
		},
	})
}

export async function getBlogMdxListItems(options: CachifiedOptions) {
	const { request, forceFresh, ttl = blogListTTL, timings } = options
	const key = 'blog:mdx-list-items'
	try {
		return await cachified({
			cache,
			request,
			timings,
			ttl,
			staleWhileRevalidate: defaultStaleWhileRevalidate,
			staleRefreshTimeout: staleRefreshJitterMs(key),
			forceFresh,
			key,
			getFreshValue: async () => {
				return getLocalBlogMdxListItemsUncached()
			},
		})
	} catch (error: unknown) {
		console.error(
			`mdx: failed to load blog list items, returning empty fallback`,
			error,
		)
		return []
	}
}

export async function downloadMdxFilesCached(
	contentDir: string,
	slug: string,
	options: CachifiedOptions,
) {
	const { forceFresh, ttl = defaultTTL, request, timings } = options
	const key = `${contentDir}:${slug}:downloaded`
	const downloaded = await cachified({
		cache,
		request,
		timings,
		ttl,
		staleWhileRevalidate: defaultStaleWhileRevalidate,
		staleRefreshTimeout: staleRefreshJitterMs(key),
		forceFresh,
		key,
		checkValue: (value: unknown) => {
			if (typeof value !== 'object') {
				return `value is not an object`
			}
			if (value === null) {
				return `value is null`
			}

			const download = value as Record<string, unknown>
			if (!Array.isArray(download.files)) {
				return `value.files is not an array`
			}
			if (typeof download.entry !== 'string') {
				return `value.entry is not a string`
			}

			return true
		},
		getFreshValue: async (context) => {
			const result = await downloadMdxFileLimit(() =>
				downloadMdxFileOrDirectory(`${contentDir}/${slug}`),
			)
			if (!result.files.length) {
				applyNotFoundCacheMetadata(context.metadata, ttl)
			}
			return result
		},
	})
	return downloaded
}

async function compileMdxCached({
	contentDir,
	slug,
	entry,
	files,
	options,
}: {
	contentDir: string
	slug: string
	entry: string
	files: Array<GitHubFile>
	options: CachifiedOptions
}) {
	const { ttl = defaultTTL } = options
	const key = `${contentDir}:${slug}:compiled`
	const page = await cachified({
		cache,
		ttl: defaultTTL,
		staleWhileRevalidate: defaultStaleWhileRevalidate,
		...options,
		key,
		staleRefreshTimeout: staleRefreshJitterMs(key),
		checkValue: checkCompiledValue,
		getFreshValue: async (context) => {
			const compiledPage = await compileMdx<MdxPage['frontmatter']>(slug, files)
			if (compiledPage) {
				return enrichCompiledMdxPage({ slug, entry, compiledPage })
			}
			applyNotFoundCacheMetadata(context.metadata, ttl)
			return null
		},
	})
	return page
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
		.filter(typedBoolean)
		.filter((p) => !p.frontmatter.draft && !p.frontmatter.unlisted)

	pages = pages.sort((a, z) => {
		const aTime = new Date(a.frontmatter.date ?? '').getTime()
		const zTime = new Date(z.frontmatter.date ?? '').getTime()
		return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
	})

	return pages
}

export async function getLocalMdxDirList(contentDir: 'blog' | 'pages') {
	if (contentDir === 'blog') {
		const localFiles = await getLocalBlogMdxFiles()
		return localFiles.map(({ slug, filePath }) => ({
			name: path.basename(filePath),
			slug,
		}))
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
		}))
}

async function getBlurDataUrl(cloudinaryId: string) {
	const imageURL = buildImageUrl(cloudinaryId, {
		transformations: {
			resize: { width: 100 },
			quality: 'auto',
			format: 'webp',
			effect: {
				name: 'blur',
				value: '1000',
			},
		},
	})
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
