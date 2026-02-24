import { type Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { matchSorter, rankings as matchSorterRankings } from 'match-sorter'
import * as YAML from 'yaml'
import { getImageBuilder } from '#app/images.tsx'
import { sortNotFoundMatches, type NotFoundMatch } from './not-found-matches.ts'
import { notFoundQueryFromPathname } from './not-found-query.ts'

function normalizePathname(pathname: string) {
	const cleaned = (pathname.split(/[?#]/)[0] ?? '').trim()
	if (!cleaned) return '/'
	if (cleaned === '/') return '/'
	return cleaned.replace(/\/+$/, '') || '/'
}

function toUrlKey(url: string) {
	// Normalize relative and absolute URLs for dedupe.
	try {
		const u = new URL(url, 'https://kentcdodds.com')
		return `${u.pathname}${u.search}`
	} catch {
		return url
	}
}

function normalizeText(value: string) {
	return value.replace(/\s+/g, ' ').trim()
}

function asNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed ? trimmed : undefined
}

function parseYamlFrontmatter(source: string): Record<string, unknown> | null {
	// Support LF and CRLF files and allow EOF after closing delimiter.
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)
	if (!match) return null
	const raw = match[1] ?? ''
	try {
		const parsed = YAML.parse(raw)
		return parsed && typeof parsed === 'object' ? (parsed as any) : null
	} catch {
		return null
	}
}

function humanizeSlug(slug: string) {
	return slug
		.replace(/[_/]+/g, ' ')
		.replace(/[-.]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\s+/g, ' ')
		.trim()
}

function buildThumbFromCloudinaryId({
	cloudinaryId,
	alt,
	size,
}: {
	cloudinaryId: string
	alt: string
	size: number
}) {
	const builder = getImageBuilder(cloudinaryId, alt)
	return builder({
		quality: 'auto',
		format: 'auto',
		background: 'rgb:e6e9ee',
		resize: { type: 'fill', width: size, height: size },
	})
}

type NotFoundDeterministicIndexItem = {
	url: string
	type: string
	title: string
	/**
	 * Optional MDX file path for enrichment (title/summary/thumb) on demand.
	 * When absent, the item is a static route.
	 */
	filePath?: string
	slug?: string
}

type MdxMeta = {
	title?: string
	summary?: string
	imageUrl?: string
	imageAlt?: string
	draft?: boolean
	unlisted?: boolean
}

const mdxMetaCache = new Map<string, MdxMeta | null>()

async function getMdxMeta(filePath: string): Promise<MdxMeta | null> {
	const cached = mdxMetaCache.get(filePath)
	if (cached !== undefined) return cached

	try {
		const source = await fs.readFile(filePath, 'utf8')
		const fm = parseYamlFrontmatter(source) ?? {}
		const title = asNonEmptyString(fm.title)
		const description = asNonEmptyString(fm.description)
		const bannerCloudinaryId = asNonEmptyString(fm.bannerCloudinaryId)
		const bannerAltRaw = fm.bannerAlt
		const bannerAlt =
			typeof bannerAltRaw === 'string' ? normalizeText(bannerAltRaw) : undefined
		const draft = fm.draft === true
		const unlisted = fm.unlisted === true

		const effectiveTitle = title
		const effectiveAlt = bannerAlt ?? effectiveTitle ?? 'Thumbnail'
		const imageUrl = bannerCloudinaryId
			? buildThumbFromCloudinaryId({
					cloudinaryId: bannerCloudinaryId,
					alt: effectiveAlt,
					size: 96,
				})
			: undefined

		const meta: MdxMeta = {
			title: effectiveTitle,
			summary: description ? normalizeText(description) : undefined,
			imageUrl,
			imageAlt: bannerCloudinaryId ? effectiveAlt : undefined,
			draft,
			unlisted,
		}
		mdxMetaCache.set(filePath, meta)
		return meta
	} catch {
		mdxMetaCache.set(filePath, null)
		return null
	}
}

async function firstExistingFile(
	filenames: ReadonlyArray<string>,
): Promise<string | null> {
	for (const filename of filenames) {
		try {
			const stat = await fs.stat(filename)
			if (stat.isFile()) return filename
		} catch (e: any) {
			if (e?.code === 'ENOENT') continue
			// If the filesystem is unhappy, skip enrichment rather than failing 404s.
			continue
		}
	}
	return null
}

function getRepoRootDir() {
	// In production Docker image, repo root is `/app`. In dev/tests, it's the
	// workspace root. `process.cwd()` is sufficient for both.
	return process.cwd()
}

function getStaticIndexItems(): Array<NotFoundDeterministicIndexItem> {
	return [
		{ url: '/', type: 'page', title: 'Home' },
		{ url: '/blog', type: 'page', title: 'Blog' },
		{ url: '/talks', type: 'page', title: 'Talks' },
		{ url: '/calls', type: 'page', title: 'Call Kent podcast' },
		{ url: '/chats', type: 'page', title: 'Chats' },
		{ url: '/youtube', type: 'page', title: 'YouTube' },
		{ url: '/search', type: 'page', title: 'Search (semantic)' },
		{ url: '/resume', type: 'page', title: 'Resume' },
		{ url: '/credits', type: 'page', title: 'Credits' },
		{ url: '/testimonials', type: 'page', title: 'Testimonials' },
	]
}

async function getBlogIndexItems(
	repoRoot: string,
): Promise<Array<NotFoundDeterministicIndexItem>> {
	const blogDir = path.join(repoRoot, 'content', 'blog')
	let entries: Array<Dirent>
	try {
		entries = await fs.readdir(blogDir, { withFileTypes: true })
	} catch {
		return []
	}

	const items: Array<NotFoundDeterministicIndexItem> = []
	for (const entry of entries) {
		const name = entry.name
		if (!name || name.startsWith('.')) continue

		if (entry.isFile() && /\.(mdx|md)$/i.test(name)) {
			const slug = name.replace(/\.(mdx|md)$/i, '')
			if (!slug) continue
			items.push({
				url: `/blog/${slug}`,
				type: 'blog',
				title: humanizeSlug(slug) || slug,
				slug,
				filePath: path.join(blogDir, name),
			})
			continue
		}

		if (entry.isDirectory()) {
			const slug = name
			if (!slug) continue
			const filePath = await firstExistingFile([
				path.join(blogDir, slug, 'index.mdx'),
				path.join(blogDir, slug, 'index.md'),
			])
			if (!filePath) continue
			items.push({
				url: `/blog/${slug}`,
				type: 'blog',
				title: humanizeSlug(slug) || slug,
				slug,
				filePath,
			})
		}
	}

	return items
}

async function walkPagesDir({
	dir,
	relativeSlug,
	items,
}: {
	dir: string
	relativeSlug: string
	items: Array<NotFoundDeterministicIndexItem>
}) {
	let entries: Array<Dirent>
	try {
		entries = await fs.readdir(dir, { withFileTypes: true })
	} catch {
		return
	}

	for (const entry of entries) {
		const name = entry.name
		if (!name || name.startsWith('.')) continue
		if (entry.isSymbolicLink()) continue
		const absolute = path.join(dir, name)
		if (entry.isDirectory()) {
			const nextRelativeSlug = relativeSlug
				? path.posix.join(relativeSlug, name)
				: name
			await walkPagesDir({
				dir: absolute,
				relativeSlug: nextRelativeSlug,
				items,
			})
			continue
		}

		if (!entry.isFile() || !/\.(mdx|md)$/i.test(name)) continue
		const baseName = name.replace(/\.(mdx|md)$/i, '')
		const slug =
			baseName === 'index'
				? relativeSlug
				: relativeSlug
					? path.posix.join(relativeSlug, baseName)
					: baseName
		if (!slug) continue
		items.push({
			url: `/${slug}`,
			type: 'page',
			title: humanizeSlug(slug) || slug,
			slug,
			filePath: absolute,
		})
	}
}

async function getPageIndexItems(
	repoRoot: string,
): Promise<Array<NotFoundDeterministicIndexItem>> {
	const pagesDir = path.join(repoRoot, 'content', 'pages')
	const items: Array<NotFoundDeterministicIndexItem> = []
	await walkPagesDir({ dir: pagesDir, relativeSlug: '', items })
	return items
}

let cachedIndex: Array<NotFoundDeterministicIndexItem> | null = null
let cachedIndexPromise: Promise<Array<NotFoundDeterministicIndexItem>> | null =
	null

async function getNotFoundDeterministicIndex(): Promise<
	Array<NotFoundDeterministicIndexItem>
> {
	if (cachedIndex) return cachedIndex
	if (cachedIndexPromise) return cachedIndexPromise

	cachedIndexPromise = (async () => {
		const repoRoot = getRepoRootDir()
		const [blogs, pages] = await Promise.all([
			getBlogIndexItems(repoRoot),
			getPageIndexItems(repoRoot),
		])

		const combined = [...getStaticIndexItems(), ...blogs, ...pages]
		const byUrl = new Map<string, NotFoundDeterministicIndexItem>()
		for (const item of combined) {
			const url = normalizePathname(item.url)
			if (!url.startsWith('/')) continue
			const key = toUrlKey(url)
			if (!byUrl.has(key)) byUrl.set(key, { ...item, url })
		}
		cachedIndex = [...byUrl.values()]
		return cachedIndex
	})().finally(() => {
		cachedIndexPromise = null
	})

	return cachedIndexPromise
}

function getQueryCandidates({
	pathname,
	baseQuery,
}: {
	pathname: string
	baseQuery: string
}) {
	const normalized = normalizePathname(pathname)
	const segments = normalized.split('/').filter(Boolean)
	const lastSegment = segments[segments.length - 1] ?? ''
	const lastQuery = lastSegment ? notFoundQueryFromPathname(lastSegment) : ''
	const withoutFirstSegmentQuery =
		segments.length > 1
			? notFoundQueryFromPathname(segments.slice(1).join('/'))
			: ''
	const rawPathQuery = normalizeText(
		normalized.replace(/^\/+/, '').replace(/[-_.\/]+/g, ' '),
	)

	const candidates = [
		baseQuery,
		withoutFirstSegmentQuery,
		lastQuery,
		rawPathQuery,
	].map((q) => q.trim())

	const unique: Array<string> = []
	const seen = new Set<string>()
	for (const q of candidates) {
		if (!q) continue
		const key = q.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)
		unique.push(q.length > 120 ? q.slice(0, 120).trim() : q)
	}
	return unique
}

const matchSorterOptions = {
	keys: [
		{ key: 'title', threshold: matchSorterRankings.CONTAINS },
		{
			key: (i: NotFoundDeterministicIndexItem) =>
				normalizeText(i.url.replace(/[-_.\/]+/g, ' ')),
			threshold: matchSorterRankings.CONTAINS,
			maxRanking: matchSorterRankings.CONTAINS,
		},
		{
			key: 'url',
			threshold: matchSorterRankings.CONTAINS,
			maxRanking: matchSorterRankings.CONTAINS,
		},
		{
			key: (i: NotFoundDeterministicIndexItem) => i.slug ?? '',
			threshold: matchSorterRankings.CONTAINS,
			maxRanking: matchSorterRankings.CONTAINS,
		},
		{
			key: 'type',
			threshold: matchSorterRankings.CONTAINS,
			maxRanking: matchSorterRankings.CONTAINS,
		},
	],
} as const

function filterIndexItems(
	items: Array<NotFoundDeterministicIndexItem>,
	searchString: string,
) {
	if (!searchString) return items

	const allResults = matchSorter(items, searchString, matchSorterOptions)
	const searches = new Set(
		searchString
			.split(' ')
			.map((s) => s.trim())
			.filter(Boolean),
	)
	if (searches.size < 2) return allResults

	const [firstWord, ...restWords] = searches.values()
	if (!firstWord) return []

	const individualWordOptions = {
		...matchSorterOptions,
		keys: matchSorterOptions.keys.map((key) => {
			return {
				...key,
				maxRanking: matchSorterRankings.CASE_SENSITIVE_EQUAL,
				threshold: matchSorterRankings.WORD_STARTS_WITH,
			}
		}),
	}

	let individualWordResults = matchSorter(
		items,
		firstWord,
		individualWordOptions,
	)
	for (const word of restWords) {
		const searchResult = matchSorter(
			individualWordResults,
			word,
			individualWordOptions,
		)
		individualWordResults = individualWordResults.filter((r) =>
			searchResult.includes(r),
		)
	}

	return Array.from(new Set([...allResults, ...individualWordResults]))
}

async function toNotFoundMatch(
	item: NotFoundDeterministicIndexItem,
): Promise<NotFoundMatch | null> {
	const base: NotFoundMatch = {
		url: item.url,
		type: item.type,
		title: item.title,
	}

	if (!item.filePath) return base
	const meta = await getMdxMeta(item.filePath)
	if (!meta) return base
	if (meta.draft || meta.unlisted) return null

	return {
		url: item.url,
		type: item.type,
		title: meta.title ?? base.title,
		summary: meta.summary,
		imageUrl: meta.imageUrl,
		imageAlt: meta.imageAlt,
	}
}

export async function getNotFoundSuggestions({
	request,
	pathname,
	limit = 8,
	priorities,
}: {
	request: Request
	pathname?: string
	limit?: number
	priorities?: ReadonlyArray<string>
}): Promise<{ query: string; matches: Array<NotFoundMatch> } | null> {
	// Keep tests fast; this can walk the repo content tree.
	if (process.env.NODE_ENV === 'test') return null
	if (request.method.toUpperCase() !== 'GET') return null

	const resolvedPathname = normalizePathname(
		typeof pathname === 'string' && pathname
			? pathname
			: new URL(request.url).pathname,
	)
	const query = notFoundQueryFromPathname(resolvedPathname)
	if (!query || query.length < 3) return null
	const safeLimit =
		typeof limit === 'number' && Number.isFinite(limit)
			? Math.max(0, Math.floor(limit))
			: 8
	if (safeLimit <= 0) return null

	try {
		const index = await getNotFoundDeterministicIndex()
		if (!index.length) return null

		const queryCandidates = getQueryCandidates({
			pathname: resolvedPathname,
			baseQuery: query,
		})

		const seen = new Set<string>()
		const matches: Array<NotFoundMatch> = []

		for (const candidate of queryCandidates) {
			if (matches.length >= safeLimit) break
			const filtered = filterIndexItems(index, candidate)
			for (const item of filtered) {
				if (matches.length >= safeLimit) break
				if (normalizePathname(item.url) === resolvedPathname) continue
				const key = toUrlKey(item.url)
				if (seen.has(key)) continue

				const match = await toNotFoundMatch(item)
				if (!match) continue
				seen.add(key)
				matches.push(match)
			}
		}

		const sorted = sortNotFoundMatches(matches, { priorities }).slice(0, safeLimit)
		return { query, matches: sorted }
	} catch (error: unknown) {
		// 404 pages should never fail the request because suggestions failed.
		console.error('Deterministic 404 suggestions failed', error)
		return null
	}
}
