import { type MdxPage } from '#app/types.ts'
import { downloadMdxFileOrDirectory } from '#app/utils/github.server.ts'
import {
	buildMdxPageFromRemoteDocument,
	getMdxRemoteDirectoryEntries,
	getMdxRemoteDocument,
} from '#app/utils/mdx-remote-documents.server.ts'
import { typedBoolean } from '#app/utils/misc.ts'
import { cache, cachified } from './cache.server.ts'
import { type Timings } from './timing.server.ts'

type CachifiedOptions = {
	forceFresh?: boolean | string
	request?: Request
	ttl?: number
	timings?: Timings
}

const defaultTTL = 1000 * 60 * 60 * 24 * 14
const defaultStaleWhileRevalidate = 1000 * 60 * 60 * 24 * 365 * 100
const notFoundTTL = 1000 * 60 * 60 * 24
const notFoundStaleWhileRevalidate = 0

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
	const { forceFresh, ttl = defaultTTL, request, timings } = options
	const key = `mdx-page:${contentDir}:${slug}:compiled`
	const page = await cachified({
		key,
		cache,
		request,
		timings,
		ttl,
		staleWhileRevalidate: defaultStaleWhileRevalidate,
		forceFresh,
		checkValue: checkCompiledValue,
		getFreshValue: async (context) => {
			const remotePage = await getMdxRemotePageCached({
				contentDir,
				slug,
				options,
			})
			if (!remotePage) {
				applyNotFoundCacheMetadata(context.metadata, ttl)
			}
			return remotePage
		},
	})
	return page
}

export async function getMdxPagesInDirectory(
	contentDir: string,
	options: CachifiedOptions,
) {
	const dirList = await getMdxDirList(contentDir, options)
	const pages = await Promise.all(
		dirList.map(async ({ slug }) => {
			return getMdxRemotePageCached({
				contentDir,
				slug,
				options,
			})
		}),
	)
	return pages.filter(typedBoolean)
}

export async function getMdxDirList(
	contentDir: string,
	options?: CachifiedOptions,
) {
	const remoteDirList = await getMdxRemoteDirListCached({
		contentDir,
		options: options ?? {},
	})
	return remoteDirList ?? []
}

async function getMdxRemotePageCached({
	contentDir,
	slug,
	options,
}: {
	contentDir: string
	slug: string
	options: CachifiedOptions
}) {
	const { forceFresh, ttl = defaultTTL, request, timings } = options
	return cachified({
		key: `${contentDir}:${slug}:compiled:remote`,
		cache,
		request,
		timings,
		ttl,
		staleWhileRevalidate: defaultStaleWhileRevalidate,
		forceFresh,
		checkValue: checkCompiledValue,
		getFreshValue: async () => {
			const remoteDocument = await getMdxRemoteDocument({ contentDir, slug })
			if (!remoteDocument) return null
			return buildMdxPageFromRemoteDocument({
				contentDir,
				slug,
				document: remoteDocument,
			})
		},
	})
}

async function getMdxRemoteDirListCached({
	contentDir,
	options,
}: {
	contentDir: string
	options: CachifiedOptions
}) {
	const { forceFresh, ttl = defaultTTL, request, timings } = options
	return cachified({
		key: `${contentDir}:dir-list:remote`,
		cache,
		request,
		timings,
		ttl,
		staleWhileRevalidate: defaultStaleWhileRevalidate,
		forceFresh,
		checkValue: (value: unknown) => Array.isArray(value),
		getFreshValue: async () => {
			return (await getMdxRemoteDirectoryEntries(contentDir)) ?? []
		},
	})
}

export async function getBlogMdxListItems(options: CachifiedOptions) {
	const { request, forceFresh, ttl = defaultTTL, timings } = options
	const key = 'blog:mdx-list-items'
	return cachified({
		cache,
		request,
		timings,
		ttl,
		staleWhileRevalidate: defaultStaleWhileRevalidate,
		forceFresh,
		key,
		getFreshValue: async () => {
			let pages = await getMdxPagesInDirectory('blog', options).then(
				(allPosts) =>
					allPosts.filter(
						(p) => !p.frontmatter.draft && !p.frontmatter.unlisted,
					),
			)

			pages = pages.sort((a, z) => {
				const aTime = new Date(a.frontmatter.date ?? '').getTime()
				const zTime = new Date(z.frontmatter.date ?? '').getTime()
				return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
			})

			return pages.map(({ code, ...rest }) => rest)
		},
	})
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
			const result = await downloadMdxFileOrDirectory(`${contentDir}/${slug}`)
			if (!result.files.length) {
				applyNotFoundCacheMetadata(context.metadata, ttl)
			}
			return result
		},
	})
	return downloaded
}
