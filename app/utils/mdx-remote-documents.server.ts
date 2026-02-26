import { type MdxRemoteDocument } from '#app/mdx-remote/compiler/types.ts'
import { deserializeMdxRemoteDocument } from '#app/mdx-remote/index.ts'
import { type MdxPage } from '#app/types.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import { formatDate } from './misc.ts'

type MdxRemoteCollection = 'blog' | 'pages' | 'writing-blog'

type KvNamespaceLike = {
	get(key: string, type?: 'text'): Promise<string | null>
}

type MdxRemoteDocumentLookupOptions = {
	contentDir: string
	slug: string
}

type MdxRemoteManifestEntry = {
	collection: MdxRemoteCollection
	slug: string
}

type MdxRemoteManifest = {
	entries: Array<MdxRemoteManifestEntry>
}

function getMdxRemoteCollection(contentDir: string): MdxRemoteCollection | null {
	if (contentDir === 'blog') return 'blog'
	if (contentDir === 'pages') return 'pages'
	if (contentDir === 'writing-blog') return 'writing-blog'
	return null
}

function getMdxRemoteDocumentKey({
	contentDir,
	slug,
}: MdxRemoteDocumentLookupOptions) {
	const collection = getMdxRemoteCollection(contentDir)
	if (!collection) return null
	return `${collection}/${slug}.json`
}

async function getMdxRemoteDocument({
	contentDir,
	slug,
}: MdxRemoteDocumentLookupOptions) {
	const documentKey = getMdxRemoteDocumentKey({ contentDir, slug })
	if (!documentKey) return null

	const source = await getMdxRemoteDocumentSourceFromBinding(documentKey)
	if (!source) return null

	try {
		return deserializeMdxRemoteDocument<Record<string, unknown>>(source)
	} catch (error: unknown) {
		console.warn(`Unable to parse mdx-remote document "${documentKey}"`, error)
		return null
	}
}

async function getMdxRemoteManifest() {
	const source = await getMdxRemoteDocumentSourceFromBinding('manifest.json')
	if (!source) return null
	try {
		const parsed = JSON.parse(source) as {
			entries?: Array<{ collection?: string; slug?: string }>
		}
		const entries = (parsed.entries ?? [])
			.filter(
				(entry): entry is { collection: string; slug: string } =>
					typeof entry?.collection === 'string' &&
					typeof entry?.slug === 'string' &&
					entry.slug.length > 0,
			)
			.filter(
				(entry): entry is MdxRemoteManifestEntry =>
					entry.collection === 'blog' ||
					entry.collection === 'pages' ||
					entry.collection === 'writing-blog',
			)
			.map((entry) => ({
				collection: entry.collection,
				slug: entry.slug,
			}))
		return { entries } satisfies MdxRemoteManifest
	} catch (error: unknown) {
		console.warn('Unable to parse mdx-remote manifest', error)
		return null
	}
}

async function getMdxRemoteDirectoryEntries(contentDir: string) {
	const collection = getMdxRemoteCollection(contentDir)
	if (!collection) return null
	const manifest = await getMdxRemoteManifest()
	if (!manifest) return null
	const uniqueSlugs = Array.from(
		new Set(
			manifest.entries
				.filter((entry) => entry.collection === collection)
				.map((entry) => entry.slug),
		),
	)
	return uniqueSlugs.map((slug) => ({ name: slug, slug }))
}

async function getMdxRemoteDocumentSourceFromBinding(artifactKey: string) {
	const kvBinding = getRuntimeBinding<KvNamespaceLike>('MDX_REMOTE_KV')
	if (!kvBinding) {
		throw new Error('Missing required runtime binding: MDX_REMOTE_KV')
	}
	try {
		return await kvBinding.get(artifactKey, 'text')
	} catch (error: unknown) {
		console.warn(
			`Unable to read mdx-remote artifact "${artifactKey}" from KV binding`,
			error,
		)
		return null
	}
}

function buildMdxPageFromRemoteDocument({
	contentDir,
	slug,
	document,
}: {
	contentDir: string
	slug: string
	document: MdxRemoteDocument<Record<string, unknown>>
}): MdxPage {
	const frontmatter = document.frontmatter as MdxPage['frontmatter']
	return {
		code: '',
		remoteDocument: document,
		slug,
		editLink: `https://github.com/kentcdodds/kentcdodds.com/edit/main/content/${contentDir}/${slug}/index.mdx`,
		...(frontmatter.date ? { dateDisplay: formatDate(frontmatter.date) } : {}),
		frontmatter,
	}
}

export {
	buildMdxPageFromRemoteDocument,
	getMdxRemoteDirectoryEntries,
	getMdxRemoteDocument,
	getMdxRemoteDocumentKey,
	getMdxRemoteManifest,
}
