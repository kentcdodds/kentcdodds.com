import { type MdxRemoteDocument } from '#app/mdx-remote/compiler/types.ts'
import { deserializeMdxRemoteDocument } from '#app/mdx-remote/index.ts'
import { type MdxPage } from '#app/types.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import { getEnv } from './env.server.ts'
import { formatDate } from './misc.ts'

type MdxRemoteCollection = 'blog' | 'pages' | 'writing-blog'

type KvNamespaceLike = {
	get(key: string, type?: 'text'): Promise<string | null>
}

type R2ObjectBodyLike = {
	text(): Promise<string>
}

type R2BucketLike = {
	get(key: string): Promise<R2ObjectBodyLike | null>
}

type MdxRemoteDocumentLookupOptions = {
	contentDir: string
	slug: string
}

function shouldUseMdxRemoteDocuments() {
	return getEnv().ENABLE_MDX_REMOTE === 'true'
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
	if (!shouldUseMdxRemoteDocuments()) return null

	const documentKey = getMdxRemoteDocumentKey({ contentDir, slug })
	if (!documentKey) return null

	const source =
		(await getMdxRemoteDocumentSourceFromBinding(documentKey)) ??
		(await getMdxRemoteDocumentSourceFromR2Binding(documentKey)) ??
		(await getMdxRemoteDocumentSourceFromBaseUrl(documentKey)) ??
		(await getMdxRemoteDocumentSourceFromLocalArtifacts(documentKey))
	if (!source) return null

	try {
		return deserializeMdxRemoteDocument<Record<string, unknown>>(source)
	} catch (error: unknown) {
		console.warn(`Unable to parse mdx-remote document "${documentKey}"`, error)
		return null
	}
}

async function getMdxRemoteDocumentSourceFromBinding(documentKey: string) {
	const kvBinding = getRuntimeBinding<KvNamespaceLike>('MDX_REMOTE_KV')
	if (!kvBinding) return null
	try {
		return await kvBinding.get(documentKey, 'text')
	} catch (error: unknown) {
		console.warn(
			`Unable to read mdx-remote document "${documentKey}" from KV binding`,
			error,
		)
		return null
	}
}

async function getMdxRemoteDocumentSourceFromR2Binding(documentKey: string) {
	const r2Binding = getRuntimeBinding<R2BucketLike>('MDX_REMOTE_R2')
	if (!r2Binding) return null
	try {
		const object = await r2Binding.get(documentKey)
		if (!object) return null
		return object.text()
	} catch (error: unknown) {
		console.warn(
			`Unable to read mdx-remote document "${documentKey}" from R2 binding`,
			error,
		)
		return null
	}
}

async function getMdxRemoteDocumentSourceFromBaseUrl(documentKey: string) {
	const baseUrl = getEnv().MDX_REMOTE_BASE_URL
	if (!baseUrl) return null
	try {
		const remoteUrl = new URL(documentKey, `${baseUrl.replace(/\/+$/, '')}/`)
		const response = await fetch(remoteUrl)
		if (!response.ok) return null
		return response.text()
	} catch (error: unknown) {
		console.warn(
			`Unable to fetch mdx-remote document "${documentKey}" from base URL`,
			error,
		)
		return null
	}
}

async function getMdxRemoteDocumentSourceFromLocalArtifacts(documentKey: string) {
	const env = getEnv()
	if (!env.MOCKS) return null
	try {
		const fs = await import('node:fs/promises')
		const path = await import('node:path')
		const artifactPath = path.resolve(
			process.cwd(),
			env.MDX_REMOTE_LOCAL_ARTIFACT_DIRECTORY,
			documentKey,
		)
		return await fs.readFile(artifactPath, 'utf8')
	} catch {
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
	getMdxRemoteDocument,
	getMdxRemoteDocumentKey,
	shouldUseMdxRemoteDocuments,
}
