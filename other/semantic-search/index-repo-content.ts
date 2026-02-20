import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { slugifyWithCounter } from '@sindresorhus/slugify'
import * as YAML from 'yaml'
import { chunkText, chunkTextRaw, makeSnippet, sha256 } from './chunk-utils.ts'
import {
	getCloudflareConfig,
	getEmbeddings,
	vectorizeDeleteByIds,
	vectorizeUpsert,
} from './cloudflare.ts'
import {
	getJsxPagePathFromSlug,
	loadJsxPageItemsFromLocalApp,
} from './jsx-page-content.ts'
import { getJsonObject, putJsonObject } from './r2-manifest.ts'

type DocType =
	| 'blog'
	| 'page'
	| 'talk'
	| 'resume'
	| 'credit'
	| 'testimonial'
	| 'jsx-page'

type ManifestChunk = {
	id: string
	hash: string
	snippet: string
	chunkIndex: number
	chunkCount: number
}

type ManifestDoc = {
	type: DocType
	url: string
	title: string
	chunks: ManifestChunk[]
}

type Manifest = {
	version: 1
	docs: Record<string, ManifestDoc>
}

function parseArgs() {
	const args = process.argv.slice(2)
	const get = (name: string) => {
		const i = args.indexOf(name)
		return i >= 0 ? args[i + 1] : undefined
	}
	return {
		before: get('--before'),
		after: get('--after'),
		manifestKey: get('--manifest-key') ?? 'manifests/repo-content.json',
		only: get('--only') ?? process.env.SEMANTIC_SEARCH_ONLY,
	}
}

function isAllZerosSha(sha: string | undefined) {
	return typeof sha === 'string' && /^0+$/.test(sha)
}

function getDocId(type: DocType, slug: string) {
	return `${type}:${slug}`
}

function getVectorId(type: DocType, slug: string, chunkIndex: number) {
	const base = `${type}:${slug}:chunk:${chunkIndex}`
	// Vectorize enforces id <= 64 bytes. Slugs can exceed this.
	// Keep readable IDs when possible, but fall back deterministically.
	if (Buffer.byteLength(base, 'utf8') <= 64) return base
	const shortSlug = sha256(slug).slice(0, 16)
	return `${type}:${shortSlug}:chunk:${chunkIndex}`
}

function getUrlForDoc(type: DocType, slug: string) {
	if (type === 'blog') return `/blog/${slug}`
	if (type === 'page') return `/${slug}`
	if (type === 'talk') return `/talks/${slug}`
	if (type === 'resume') return `/resume`
	if (type === 'credit') return `/credits`
	if (type === 'testimonial') return `/testimonials`
	if (type === 'jsx-page') return getJsxPagePathFromSlug(slug)
	// exhaustive guard
	return `/${slug}`
}

function getTitleFromMdxSource(source: string) {
	// If there’s frontmatter, prefer its title; otherwise fall back to null.
	const fmMatch = source.match(/^---\n([\s\S]*?)\n---\n/)
	if (!fmMatch) return null
	const fm = fmMatch[1] ?? ''
	const titleMatch = fm.match(/^\s*title:\s*(?<value>.+?)\s*$/m)
	const value = titleMatch?.groups?.value
	if (!value) return null
	return value.replace(/^["']|["']$/g, '').trim() || null
}

async function readMdxDoc(type: DocType, slug: string) {
	if (type !== 'blog' && type !== 'page') {
		throw new Error(`readMdxDoc only supports blog/page. Got: ${type}`)
	}
	if (type === 'blog') {
		// Blog posts can be either:
		// - content/blog/<slug>/index.mdx
		// - content/blog/<slug>.mdx
		const dirFilename = path.join('content', 'blog', slug, 'index.mdx')
		try {
			const source = await fs.readFile(dirFilename, 'utf8')
			return { filename: dirFilename, source }
		} catch (e: any) {
			if (e?.code !== 'ENOENT' && e?.code !== 'ENOTDIR') throw e
		}
		const fileFilename = path.join('content', 'blog', `${slug}.mdx`)
		const source = await fs.readFile(fileFilename, 'utf8')
		return { filename: fileFilename, source }
	}
	const filename = path.join('content', 'pages', `${slug}.mdx`)
	const source = await fs.readFile(filename, 'utf8')
	return { filename, source }
}

function getSlugFromContentPath(
	filePath: string,
): { type: DocType; slug: string } | null {
	const parts = filePath.replace(/\\/g, '/').split('/')
	const [contentDir, typeDir] = parts
	if (contentDir !== 'content') return null
	if (typeDir === 'blog') {
		// content/blog/<slug>/...
		// content/blog/<slug>.mdx
		const segment = parts[2]
		if (!segment) return null
		const slug = segment.replace(/\.mdx$/, '')
		return { type: 'blog', slug }
	}
	if (typeDir === 'pages') {
		// content/pages/<slug>.mdx
		const filename = parts[2]
		if (!filename) return null
		const slug = filename.replace(/\.mdx$/, '')
		return { type: 'page', slug }
	}
	return null
}

function getChangedFiles(before: string, after: string) {
	const output = execSync(
		`git diff --name-status ${before} ${after} -- content/blog content/pages content/data app other/semantic-search`,
	).toString()
	const lines = output.split('\n').filter(Boolean)
	const addedOrModified = new Set<string>()
	const deleted = new Set<string>()

	for (const line of lines) {
		const [status, a, b] = line.split('\t')
		if (!status) continue
		if (status.startsWith('R') && a && b) {
			deleted.add(a)
			addedOrModified.add(b)
			continue
		}
		if ((status === 'A' || status === 'M') && a) {
			addedOrModified.add(a)
			continue
		}
		if (status === 'D' && a) {
			deleted.add(a)
			continue
		}
	}

	return { addedOrModified: [...addedOrModified], deleted: [...deleted] }
}

type SyntheticIndexItem = {
	slug: string
	title: string
	url: string
	source: string
}

let _talksIndex: {
	items: SyntheticIndexItem[]
	bySlug: Map<string, SyntheticIndexItem>
} | null = null
async function loadTalksIndex() {
	if (_talksIndex) return _talksIndex
	const talksFilename = path.join('content', 'data', 'talks.yml')
	const raw = await fs.readFile(talksFilename, 'utf8')
	const parsed = YAML.parse(raw)
	if (!Array.isArray(parsed)) {
		throw new Error('Talks YAML is not an array')
	}
	const slugify = slugifyWithCounter()
	slugify.reset()

	const items: SyntheticIndexItem[] = []
	for (const talk of parsed as Array<any>) {
		const title = typeof talk?.title === 'string' ? talk.title : 'TBA'
		const slug = slugify(title || 'tba')
		const tags = Array.isArray(talk?.tags)
			? talk.tags.filter((t: any) => typeof t === 'string')
			: []
		const deliveries = Array.isArray(talk?.deliveries) ? talk.deliveries : []
		const resources = Array.isArray(talk?.resources) ? talk.resources : []
		const description =
			typeof talk?.description === 'string' ? talk.description : ''

		const sourceLines = [
			`# ${title}`,
			'',
			tags.length ? `Tags: ${tags.join(', ')}` : '',
			description ? `Description: ${description}` : '',
			resources.length
				? `Resources:\n${resources.map((r: any) => `- ${String(r)}`).join('\n')}`
				: '',
			deliveries.length
				? `Deliveries:\n${deliveries
						.map((d: any) => {
							const event = typeof d?.event === 'string' ? d.event : ''
							const date = typeof d?.date === 'string' ? d.date : ''
							const recording =
								typeof d?.recording === 'string' ? d.recording : ''
							return `- ${[date, event, recording].filter(Boolean).join(' | ')}`
						})
						.join('\n')}`
				: '',
		].filter(Boolean)

		items.push({
			slug,
			title,
			url: `/talks/${slug}`,
			source: sourceLines.join('\n').trim(),
		})
	}

	_talksIndex = { items, bySlug: new Map(items.map((i) => [i.slug, i])) }
	return _talksIndex
}

let _creditsIndex: {
	items: SyntheticIndexItem[]
	bySlug: Map<string, SyntheticIndexItem>
} | null = null
async function loadCreditsIndex() {
	if (_creditsIndex) return _creditsIndex
	const filename = path.join('content', 'data', 'credits.yml')
	const raw = await fs.readFile(filename, 'utf8')
	const parsed = YAML.parse(raw)
	if (!Array.isArray(parsed)) {
		throw new Error('Credits YAML is not an array')
	}
	const slugify = slugifyWithCounter()
	slugify.reset()

	const items: SyntheticIndexItem[] = []
	for (const person of parsed as Array<any>) {
		const name = typeof person?.name === 'string' ? person.name : 'Unnamed'
		const slug = slugify(name || 'unnamed')
		const role = typeof person?.role === 'string' ? person.role : ''
		const description =
			typeof person?.description === 'string' ? person.description : ''
		const socials = Object.entries(person ?? {})
			.filter(
				([key, value]) =>
					typeof value === 'string' &&
					/^(https?:\/\/|mailto:)/.test(value) &&
					key !== 'cloudinaryId',
			)
			.map(([key, value]) => `${key}: ${value}`)

		const sourceLines = [
			`# ${name}`,
			role ? `Role: ${role}` : '',
			description ? `Description: ${description}` : '',
			socials.length
				? `Links:\n${socials.map((s) => `- ${s}`).join('\n')}`
				: '',
		].filter(Boolean)

		items.push({
			slug,
			title: name,
			url: `/credits`,
			source: sourceLines.join('\n').trim(),
		})
	}

	_creditsIndex = { items, bySlug: new Map(items.map((i) => [i.slug, i])) }
	return _creditsIndex
}

let _testimonialsIndex: {
	items: SyntheticIndexItem[]
	bySlug: Map<string, SyntheticIndexItem>
} | null = null
async function loadTestimonialsIndex() {
	if (_testimonialsIndex) return _testimonialsIndex
	const filename = path.join('content', 'data', 'testimonials.yml')
	const raw = await fs.readFile(filename, 'utf8')
	const parsed = YAML.parse(raw)
	if (!Array.isArray(parsed)) {
		throw new Error('Testimonials YAML is not an array')
	}
	const slugify = slugifyWithCounter()
	slugify.reset()

	const items: SyntheticIndexItem[] = []
	for (const t of parsed as Array<any>) {
		const author = typeof t?.author === 'string' ? t.author : 'Anonymous'
		const slug = slugify(author || 'anonymous')
		const company = typeof t?.company === 'string' ? t.company : ''
		const subjects = Array.isArray(t?.subjects)
			? t.subjects.filter((s: any) => typeof s === 'string')
			: []
		const testimonial = typeof t?.testimonial === 'string' ? t.testimonial : ''
		const link = typeof t?.link === 'string' ? t.link : ''

		const sourceLines = [
			`# ${author}`,
			company ? `Company: ${company}` : '',
			subjects.length ? `Subjects: ${subjects.join(', ')}` : '',
			link ? `Link: ${link}` : '',
			testimonial ? `Testimonial: ${testimonial}` : '',
		].filter(Boolean)

		items.push({
			slug,
			title: `Testimonial by ${author}`,
			url: `/testimonials`,
			source: sourceLines.join('\n').trim(),
		})
	}

	_testimonialsIndex = { items, bySlug: new Map(items.map((i) => [i.slug, i])) }
	return _testimonialsIndex
}

let _resumeIndex: SyntheticIndexItem | null = null
async function loadResumeIndex() {
	if (_resumeIndex) return _resumeIndex
	const filename = path.join('content', 'data', 'resume.yml')
	const raw = await fs.readFile(filename, 'utf8')
	const parsed = YAML.parse(raw) as any

	const header = parsed?.header ?? {}
	const name = typeof header?.name === 'string' ? header.name : 'Kent C. Dodds'
	const title = typeof header?.title === 'string' ? header.title : 'Resume'
	const location = typeof header?.location === 'string' ? header.location : ''
	const links = Array.isArray(header?.links) ? header.links : []
	const linkLines = links
		.map((l: any) => {
			const label = typeof l?.label === 'string' ? l.label : ''
			const href = typeof l?.href === 'string' ? l.href : ''
			return label && href ? `- ${label}: ${href}` : null
		})
		.filter(Boolean) as string[]

	const sourceLines = [
		`# Resume`,
		`Name: ${name}`,
		`Title: ${title}`,
		location ? `Location: ${location}` : '',
		linkLines.length ? `Links:\n${linkLines.join('\n')}` : '',
		'',
		// Index the full YAML too so we don't have to keep perfect parity with the UI formatting.
		`Raw:\n${raw}`.trim(),
	].filter(Boolean)

	_resumeIndex = {
		slug: 'resume',
		title: `Resume`,
		url: `/resume`,
		source: sourceLines.join('\n').trim(),
	}
	return _resumeIndex
}

let _jsxPageIndex: {
	items: SyntheticIndexItem[]
	bySlug: Map<string, SyntheticIndexItem>
} | null = null
async function loadJsxPageIndex() {
	if (_jsxPageIndex) return _jsxPageIndex
	const items = await loadJsxPageItemsFromLocalApp()
	_jsxPageIndex = { items, bySlug: new Map(items.map((i) => [i.slug, i])) }
	return _jsxPageIndex
}

async function getAllSyntheticDocRefs(): Promise<
	Array<{ type: DocType; slug: string }>
> {
	const talks = await loadTalksIndex()
	const credits = await loadCreditsIndex()
	const testimonials = await loadTestimonialsIndex()
	const resume = await loadResumeIndex()
	return [
		...talks.items.map((t) => ({ type: 'talk' as const, slug: t.slug })),
		{ type: 'resume' as const, slug: resume.slug },
		...credits.items.map((c) => ({ type: 'credit' as const, slug: c.slug })),
		...testimonials.items.map((t) => ({
			type: 'testimonial' as const,
			slug: t.slug,
		})),
	]
}

async function getAllJsxPageDocRefs(): Promise<
	Array<{ type: DocType; slug: string }>
> {
	const jsxPages = await loadJsxPageIndex()
	return jsxPages.items.map((item) => ({
		type: 'jsx-page' as const,
		slug: item.slug,
	}))
}

async function getSyntheticDoc(
	type: DocType,
	slug: string,
): Promise<SyntheticIndexItem> {
	if (type === 'jsx-page') {
		const jsxPages = await loadJsxPageIndex()
		const item = jsxPages.bySlug.get(slug)
		if (!item) throw new Error(`Unknown jsx-page slug: ${slug}`)
		return item
	}
	if (type === 'talk') {
		const talks = await loadTalksIndex()
		const item = talks.bySlug.get(slug)
		if (!item) throw new Error(`Unknown talk slug: ${slug}`)
		return item
	}
	if (type === 'resume') {
		const resume = await loadResumeIndex()
		return resume
	}
	if (type === 'credit') {
		const credits = await loadCreditsIndex()
		const item = credits.bySlug.get(slug)
		if (!item) throw new Error(`Unknown credit slug: ${slug}`)
		return item
	}
	if (type === 'testimonial') {
		const testimonials = await loadTestimonialsIndex()
		const item = testimonials.bySlug.get(slug)
		if (!item) throw new Error(`Unknown testimonial slug: ${slug}`)
		return item
	}
	throw new Error(`Not a synthetic doc type: ${type}`)
}

function uniqDocRefs(refs: Array<{ type: DocType; slug: string }>) {
	const docs = new Map<string, { type: DocType; slug: string }>()
	for (const doc of refs) docs.set(getDocId(doc.type, doc.slug), doc)
	return [...docs.values()]
}

function docsFromMdxPaths(paths: string[]) {
	const refs: Array<{ type: DocType; slug: string }> = []
	for (const p of paths) {
		const doc = getSlugFromContentPath(p)
		if (doc) refs.push(doc)
	}
	return uniqDocRefs(refs)
}

function manifestDocsByType(manifest: Manifest, type: DocType) {
	return Object.entries(manifest.docs)
		.map(([docId, doc]) => ({ docId, doc }))
		.filter((x) => x.doc.type === type)
		.map((x) => {
			const slug = x.docId.slice(`${type}:`.length)
			return { type, slug }
		})
}

async function getDocsFromChangedPaths({
	addedOrModified,
	deleted,
	manifest,
}: {
	addedOrModified: string[]
	deleted: string[]
	manifest: Manifest
}) {
	const docsToIndex: Array<{ type: DocType; slug: string }> = [
		...docsFromMdxPaths(addedOrModified),
	]
	let docsToDelete: Array<{ type: DocType; slug: string }> = [
		...docsFromMdxPaths(deleted),
	]

	const dataChanged = new Set(
		[...addedOrModified, ...deleted].filter((p) =>
			p.replace(/\\/g, '/')?.startsWith('content/data/'),
		),
	)
	const allChanged = [...addedOrModified, ...deleted].map((p) =>
		p.replace(/\\/g, '/'),
	)
	const jsxPagesChanged = allChanged.some(
		(p) =>
			p.startsWith('app/') ||
			p.startsWith('content/data/') ||
			p.startsWith('other/semantic-search/'),
	)

	const talksFile = 'content/data/talks.yml'
	const resumeFile = 'content/data/resume.yml'
	const creditsFile = 'content/data/credits.yml'
	const testimonialsFile = 'content/data/testimonials.yml'

	// Talks: treat each talk as its own doc; if the YAML changes, reindex them all
	// and delete any old talk docs that no longer exist.
	if (dataChanged.has(talksFile)) {
		if (deleted.includes(talksFile)) {
			docsToDelete.push(...manifestDocsByType(manifest, 'talk'))
		} else {
			const talks = await loadTalksIndex()
			docsToIndex.push(
				...talks.items.map((t) => ({ type: 'talk' as const, slug: t.slug })),
			)
			const current = new Set(talks.items.map((t) => t.slug))
			docsToDelete.push(
				...manifestDocsByType(manifest, 'talk').filter(
					(d) => !current.has(d.slug),
				),
			)
		}
	}

	// Credits: per-person docs.
	if (dataChanged.has(creditsFile)) {
		if (deleted.includes(creditsFile)) {
			docsToDelete.push(...manifestDocsByType(manifest, 'credit'))
		} else {
			const credits = await loadCreditsIndex()
			docsToIndex.push(
				...credits.items.map((c) => ({
					type: 'credit' as const,
					slug: c.slug,
				})),
			)
			const current = new Set(credits.items.map((c) => c.slug))
			docsToDelete.push(
				...manifestDocsByType(manifest, 'credit').filter(
					(d) => !current.has(d.slug),
				),
			)
		}
	}

	// Testimonials: per-author docs.
	if (dataChanged.has(testimonialsFile)) {
		if (deleted.includes(testimonialsFile)) {
			docsToDelete.push(...manifestDocsByType(manifest, 'testimonial'))
		} else {
			const testimonials = await loadTestimonialsIndex()
			docsToIndex.push(
				...testimonials.items.map((t) => ({
					type: 'testimonial' as const,
					slug: t.slug,
				})),
			)
			const current = new Set(testimonials.items.map((t) => t.slug))
			docsToDelete.push(
				...manifestDocsByType(manifest, 'testimonial').filter(
					(d) => !current.has(d.slug),
				),
			)
		}
	}

	// Resume: single doc.
	if (dataChanged.has(resumeFile)) {
		if (deleted.includes(resumeFile)) {
			docsToDelete.push({ type: 'resume', slug: 'resume' })
		} else {
			docsToIndex.push({ type: 'resume', slug: 'resume' })
		}
	}

	if (jsxPagesChanged) {
		const jsxPages = await loadJsxPageIndex()
		docsToIndex.push(
			...jsxPages.items.map((item) => ({
				type: 'jsx-page' as const,
				slug: item.slug,
			})),
		)
		const current = new Set(jsxPages.items.map((item) => item.slug))
		docsToDelete.push(
			...manifestDocsByType(manifest, 'jsx-page').filter(
				(doc) => !current.has(doc.slug),
			),
		)
	}

	return {
		docsToIndex: uniqDocRefs(docsToIndex),
		docsToDelete: uniqDocRefs(docsToDelete),
	}
}

function batch<T>(items: T[], size: number) {
	const result: T[][] = []
	for (let i = 0; i < items.length; i += size) {
		result.push(items.slice(i, i + size))
	}
	return result
}

async function embedItemsSafely({
	accountId,
	apiToken,
	model,
	items,
}: {
	accountId: string
	apiToken: string
	model: string
	items: Array<{
		vectorId: string
		text: string
		metadata: Record<string, unknown>
	}>
}): Promise<
	Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>
> {
	try {
		const embeddings = await getEmbeddings({
			accountId,
			apiToken,
			model,
			texts: items.map((b) => b.text),
		})
		return items.map((item, i) => ({
			id: item.vectorId,
			values: embeddings[i]!,
			metadata: item.metadata,
		}))
	} catch (e) {
		// If a batch fails (e.g. one input too large/invalid), split and retry to
		// isolate the bad input instead of failing the whole indexing run.
		if (items.length <= 1) {
			const item = items[0]
			console.error('Skipping vector due to embedding failure', {
				vectorId: item?.vectorId,
				textLength: item?.text?.length,
			})
			console.error(e)
			return []
		}
		const mid = Math.ceil(items.length / 2)
		const left = await embedItemsSafely({
			accountId,
			apiToken,
			model,
			items: items.slice(0, mid),
		})
		const right = await embedItemsSafely({
			accountId,
			apiToken,
			model,
			items: items.slice(mid),
		})
		return [...left, ...right]
	}
}

async function main() {
	const { before, after, manifestKey, only } = parseArgs()
	const { accountId, apiToken, vectorizeIndex, embeddingModel } =
		getCloudflareConfig()
	const r2Bucket = process.env.R2_BUCKET ?? 'kcd-semantic-search'

	const manifest = (await getJsonObject<Manifest>({
		bucket: r2Bucket,
		key: manifestKey,
	})) ?? {
		version: 1,
		docs: {},
	}

	let docsToIndex: Array<{ type: DocType; slug: string }> = []
	let docsToDelete: Array<{ type: DocType; slug: string }> = []

	if (only) {
		docsToIndex = only
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => {
				const [type, slug] = s.split(':')
				if (
					(type === 'blog' ||
						type === 'page' ||
						type === 'talk' ||
						type === 'resume' ||
						type === 'credit' ||
						type === 'testimonial' ||
						type === 'jsx-page') &&
					slug
				) {
					return { type: type as DocType, slug }
				}
				return null
			})
			.filter(Boolean) as Array<{ type: DocType; slug: string }>
		console.log(`Only indexing explicitly requested docs: ${only}`)
	} else if (!before || !after || isAllZerosSha(before)) {
		// Full index.
		const blogEntries = await fs.readdir(path.join('content', 'blog'), {
			withFileTypes: true,
		})
		docsToIndex = blogEntries
			.map((entry) => {
				if (entry.isDirectory()) {
					return { type: 'blog' as const, slug: entry.name }
				}
				if (entry.isFile() && entry.name.endsWith('.mdx')) {
					return {
						type: 'blog' as const,
						slug: entry.name.replace(/\.mdx$/, ''),
					}
				}
				return null
			})
			.filter(Boolean) as Array<{ type: DocType; slug: string }>
		const pageFiles = await fs.readdir(path.join('content', 'pages'))
		docsToIndex.push(
			...pageFiles
				.filter((f) => f.endsWith('.mdx'))
				.map((f) => ({ type: 'page' as const, slug: f.replace(/\.mdx$/, '') })),
		)

		// YAML-backed site sections
		docsToIndex.push(...(await getAllSyntheticDocRefs()))
		docsToIndex.push(...(await getAllJsxPageDocRefs()))

		// Remove docs that no longer exist (e.g. deleted posts, removed talks).
		const keep = new Set(docsToIndex.map((d) => getDocId(d.type, d.slug)))
		docsToDelete = Object.keys(manifest.docs)
			.filter((docId) => !keep.has(docId))
			.map((docId) => {
				const [type, ...rest] = docId.split(':')
				return { type: type as DocType, slug: rest.join(':') }
			})
	} else {
		const changed = getChangedFiles(before, after)
		const updated = await getDocsFromChangedPaths({
			addedOrModified: changed.addedOrModified,
			deleted: changed.deleted,
			manifest,
		})
		docsToIndex = updated.docsToIndex
		docsToDelete = updated.docsToDelete
	}

	console.log(`Docs to index: ${docsToIndex.length}`)
	console.log(`Docs to delete: ${docsToDelete.length}`)

	const idsToDelete: string[] = []
	const toUpsert: Array<{
		vectorId: string
		text: string
		metadata: Record<string, unknown>
	}> = []

	// Handle deletions
	for (const { type, slug } of docsToDelete) {
		const docId = getDocId(type, slug)
		const old = manifest.docs[docId]
		if (!old) continue
		for (const chunk of old.chunks) idsToDelete.push(chunk.id)
		delete manifest.docs[docId]
	}

	// Handle updates/inserts
	for (const { type, slug } of docsToIndex) {
		const docId = getDocId(type, slug)
		const url = getUrlForDoc(type, slug)
		let source = ''
		let title = slug
		if (type === 'blog' || type === 'page') {
			const mdx = await readMdxDoc(type, slug)
			source = mdx.source
			title = getTitleFromMdxSource(source) ?? slug
		} else {
			const synthetic = await getSyntheticDoc(type, slug)
			source = synthetic.source
			title = synthetic.title
		}

		// Index raw MDX for MDX-backed docs, and cleaned rendered text for JSX pages.
		const chunkBodies =
			type === 'blog' || type === 'page'
				? chunkTextRaw(source, {
						targetChars: 2500,
						overlapChars: 250,
						maxChunkChars: 3500,
					})
				: type === 'jsx-page'
					? chunkText(source, {
							targetChars: 3500,
							overlapChars: 450,
							maxChunkChars: 5000,
						})
					: chunkTextRaw(source, {
							targetChars: 2500,
							overlapChars: 250,
							maxChunkChars: 3500,
						})
		const chunkCount = chunkBodies.length

		const chunks: ManifestChunk[] = []
		const oldChunksById = new Map(
			(manifest.docs[docId]?.chunks ?? []).map((c) => [c.id, c]),
		)

		for (let i = 0; i < chunkBodies.length; i++) {
			const chunkBody = chunkBodies[i] ?? ''
			const metadataType = type === 'jsx-page' ? 'page' : type
			const preamble = `Title: ${title}\nType: ${metadataType}\nURL: ${url}\n\n`
			const chunkTextForEmbedding = `${preamble}${chunkBody}`
			const vectorId = getVectorId(type, slug, i)
			const contentHash = sha256(chunkTextForEmbedding)
			const snippet = makeSnippet(chunkBody)

			chunks.push({
				id: vectorId,
				hash: contentHash,
				snippet,
				chunkIndex: i,
				chunkCount,
			})

			const existing = oldChunksById.get(vectorId)
			if (existing?.hash === contentHash) continue

			toUpsert.push({
				vectorId,
				text: chunkTextForEmbedding,
				metadata: {
					type: metadataType,
					slug,
					url,
					title,
					snippet,
					chunkIndex: i,
					chunkCount,
					contentHash,
				},
			})
		}

		// Removed chunks
		for (const old of oldChunksById.values()) {
			if (!chunks.find((c) => c.id === old.id)) {
				idsToDelete.push(old.id)
			}
		}

		manifest.docs[docId] = { type, url, title, chunks }
	}

	// Deletes first (avoid stale chunks lingering for renamed content)
	for (const idBatch of batch(idsToDelete, 500)) {
		if (!idBatch.length) continue
		console.log(`Deleting ${idBatch.length} vectors...`)
		await vectorizeDeleteByIds({
			accountId,
			apiToken,
			indexName: vectorizeIndex,
			ids: idBatch,
		})
	}

	// Embed + upsert changed chunks
	console.log(`Vectors to upsert: ${toUpsert.length}`)
	const upsertVectors: Array<{
		id: string
		values: number[]
		metadata: Record<string, unknown>
	}> = []

	const embedBatches = batch(toUpsert, 50)
	for (let i = 0; i < embedBatches.length; i++) {
		const embedBatch = embedBatches[i]!
		console.log(
			`Embedding batch ${i + 1}/${embedBatches.length} (${embedBatch.length} items)`,
		)
		const vectors = await embedItemsSafely({
			accountId,
			apiToken,
			model: embeddingModel,
			items: embedBatch,
		})
		console.log(
			`Embedded batch ${i + 1}/${embedBatches.length} -> ${vectors.length} vectors`,
		)
		upsertVectors.push(...vectors)
	}

	const upsertBatches = batch(upsertVectors, 200)
	for (let i = 0; i < upsertBatches.length; i++) {
		const vecBatch = upsertBatches[i]!
		if (!vecBatch.length) continue
		console.log(
			`Upserting batch ${i + 1}/${upsertBatches.length} (${vecBatch.length} vectors)`,
		)
		await vectorizeUpsert({
			accountId,
			apiToken,
			indexName: vectorizeIndex,
			vectors: vecBatch,
		})
	}

	await putJsonObject({ bucket: r2Bucket, key: manifestKey, value: manifest })
	console.log(`Updated manifest written to r2://${r2Bucket}/${manifestKey}`)
}

main().catch((e) => {
	console.error(e)
	process.exitCode = 1
})
