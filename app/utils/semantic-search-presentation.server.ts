import fs from 'node:fs/promises'
import path from 'node:path'
import { slugifyWithCounter } from '@sindresorhus/slugify'
import * as YAML from 'yaml'
import { getImageBuilder, images } from '#app/images.tsx'

type SupportedRepoDocType =
	| 'blog'
	| 'page'
	| 'talk'
	| 'resume'
	| 'credit'
	| 'testimonial'

export type SemanticSearchPresentation = {
	/**
	 * A short description suitable for list UIs.
	 */
	summary?: string
	imageUrl?: string
	imageAlt?: string
}

type ResultLike = {
	id?: string
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	imageUrl?: string
	imageAlt?: string
}

function normalizeText(value: string) {
	return value.replace(/\s+/g, ' ').trim()
}

function truncate(value: string, maxLen: number) {
	const text = normalizeText(value)
	if (text.length <= maxLen) return text
	return `${text.slice(0, Math.max(0, maxLen - 3))}...`
}

function asNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed ? trimmed : undefined
}

function getRepoRootDir() {
	// In production Docker image, repo root is `/app`. In dev/tests, it's the
	// workspace root. `process.cwd()` is sufficient for both.
	return process.cwd()
}

function buildThumbFromImageId({
	imageId,
	alt,
	size,
}: {
	imageId: string
	alt: string
	size: number
}) {
	const builder = getImageBuilder(imageId, alt)
	return builder({
		quality: 'auto',
		format: 'auto',
		background: 'rgb:e6e9ee',
		resize: { type: 'fill', width: size, height: size },
	})
}

function getFallbackPresentation(
	type: string | undefined,
): Required<Pick<SemanticSearchPresentation, 'imageUrl' | 'imageAlt'>> {
	if (type === 'ck') {
		return {
			imageUrl: images.microphone({
				quality: 'auto',
				format: 'auto',
				resize: { type: 'pad', width: 96, height: 96 },
			}),
			imageAlt: images.microphone.alt,
		}
	}
	if (type === 'cwk') {
		return {
			imageUrl: images.kayak({
				quality: 'auto',
				format: 'auto',
				resize: { type: 'pad', width: 96, height: 96 },
			}),
			imageAlt: images.kayak.alt,
		}
	}
	if (type === 'youtube') {
		return {
			imageUrl: images.microphoneWithHands({
				quality: 'auto',
				format: 'auto',
				resize: { type: 'fill', width: 96, height: 96 },
			}),
			imageAlt: images.microphoneWithHands.alt,
		}
	}
	if (type === 'podcast') {
		return {
			imageUrl: images.microphone({
				quality: 'auto',
				format: 'auto',
				resize: { type: 'pad', width: 96, height: 96 },
			}),
			imageAlt: images.microphone.alt,
		}
	}
	if (type === 'talk') {
		return {
			imageUrl: images.kentSpeakingAllThingsOpen({
				quality: 'auto',
				format: 'auto',
				resize: { type: 'fill', width: 96, height: 96 },
			}),
			imageAlt: images.kentSpeakingAllThingsOpen.alt,
		}
	}
	if (type === 'resume') {
		return {
			imageUrl: images.kentProfile({
				quality: 'auto',
				format: 'auto',
				resize: { type: 'fill', width: 96, height: 96 },
			}),
			imageAlt: images.kentProfile.alt,
		}
	}
	// Default fallback: a neutral Kody.
	return {
		imageUrl: images.kodyProfileGray({
			quality: 'auto',
			format: 'auto',
			resize: { type: 'pad', width: 96, height: 96 },
		}),
		imageAlt: images.kodyProfileGray.alt,
	}
}

function normalizePathname(pathname: string) {
	const cleaned = pathname.split(/[?#]/)[0] ?? ''
	if (cleaned === '/') return '/'
	return cleaned.replace(/\/+$/, '') || '/'
}

function inferSlugFromUrl({
	type,
	url,
}: {
	type: string
	url: string | undefined
}): string | null {
	if (!url) return null

	let pathname = url
	try {
		if (/^https?:\/\//i.test(url)) pathname = new URL(url).pathname
	} catch {
		// ignore invalid URLs
	}
	pathname = normalizePathname(pathname)

	if (type === 'blog') {
		if (!pathname.startsWith('/blog/')) return null
		const slug = pathname.slice('/blog/'.length)
		return slug ? slug : null
	}

	if (type === 'page') {
		if (pathname === '/') return null
		if (!pathname.startsWith('/')) return null
		const slug = pathname.slice(1)
		return slug ? slug : null
	}

	if (type === 'talk') {
		if (!pathname.startsWith('/talks/')) return null
		const slug = pathname.slice('/talks/'.length)
		return slug ? slug : null
	}

	return null
}

function parseYamlFrontmatter(source: string): Record<string, unknown> | null {
	const match = source.match(/^---\n([\s\S]*?)\n---\n/u)
	if (!match) return null
	const raw = match[1] ?? ''
	try {
		const parsed = YAML.parse(raw)
		return parsed && typeof parsed === 'object' ? (parsed as any) : null
	} catch {
		return null
	}
}

async function readMdxSourceForSlug(type: 'blog' | 'page', slug: string) {
	const root = getRepoRootDir()
	if (type === 'page') {
		const filename = path.join(root, 'content', 'pages', `${slug}.mdx`)
		return await fs.readFile(filename, 'utf8')
	}

	// Blog posts can be either:
	// - content/blog/<slug>/index.mdx
	// - content/blog/<slug>.mdx
	const dirFilename = path.join(root, 'content', 'blog', slug, 'index.mdx')
	try {
		return await fs.readFile(dirFilename, 'utf8')
	} catch (e: any) {
		if (e?.code !== 'ENOENT' && e?.code !== 'ENOTDIR') throw e
	}
	const fileFilename = path.join(root, 'content', 'blog', `${slug}.mdx`)
	return await fs.readFile(fileFilename, 'utf8')
}

type RepoDocMeta = {
	title?: string
	summary?: string
	imageId?: string
	imageAlt?: string
}

const mdxMetaCache = new Map<string, RepoDocMeta>()

async function getMdxDocMeta({
	type,
	slug,
}: {
	type: 'blog' | 'page'
	slug: string
}): Promise<RepoDocMeta | null> {
	const cacheKey = `${type}:${slug}`
	const cached = mdxMetaCache.get(cacheKey)
	if (cached) return cached

	try {
		const source = await readMdxSourceForSlug(type, slug)
		const fm = parseYamlFrontmatter(source)
		const title = asNonEmptyString(fm?.title)
		const description = asNonEmptyString(fm?.description)
		const bannerImageId = asNonEmptyString(fm?.bannerImageId)
		const bannerAltRaw = fm?.bannerAlt
		const bannerAlt =
			typeof bannerAltRaw === 'string' ? normalizeText(bannerAltRaw) : undefined

		const meta: RepoDocMeta = {
			title,
			summary: description,
			imageId: bannerImageId,
			imageAlt: bannerAlt,
		}
		mdxMetaCache.set(cacheKey, meta)
		return meta
	} catch {
		return null
	}
}

type TalkMeta = { title: string; description?: string }
let talksBySlug: Map<string, TalkMeta> | null = null
async function loadTalksBySlug() {
	if (talksBySlug) return talksBySlug
	const root = getRepoRootDir()
	const filename = path.join(root, 'content', 'data', 'talks.yml')
	const raw = await fs.readFile(filename, 'utf8')
	const parsed = YAML.parse(raw)
	if (!Array.isArray(parsed)) {
		talksBySlug = new Map()
		return talksBySlug
	}

	const slugify = slugifyWithCounter()
	slugify.reset()
	const map = new Map<string, TalkMeta>()
	for (const talk of parsed as Array<any>) {
		const title = typeof talk?.title === 'string' ? talk.title : 'TBA'
		const slug = slugify(title || 'tba')
		const description =
			typeof talk?.description === 'string' ? talk.description : undefined
		map.set(slug, { title, description })
	}
	talksBySlug = map
	return map
}

type CreditMeta = {
	name: string
	role?: string
	description?: string
	imageId?: string
}
let creditsBySlug: Map<string, CreditMeta> | null = null
async function loadCreditsBySlug() {
	if (creditsBySlug) return creditsBySlug
	const root = getRepoRootDir()
	const filename = path.join(root, 'content', 'data', 'credits.yml')
	const raw = await fs.readFile(filename, 'utf8')
	const parsed = YAML.parse(raw)
	if (!Array.isArray(parsed)) {
		creditsBySlug = new Map()
		return creditsBySlug
	}

	const slugify = slugifyWithCounter()
	slugify.reset()
	const map = new Map<string, CreditMeta>()
	for (const person of parsed as Array<any>) {
		const name = typeof person?.name === 'string' ? person.name : 'Unnamed'
		const slug = slugify(name || 'unnamed')
		map.set(slug, {
			name,
			role: typeof person?.role === 'string' ? person.role : undefined,
			description:
				typeof person?.description === 'string'
					? person.description
					: undefined,
			imageId:
				typeof person?.imageId === 'string'
					? person.imageId
					: undefined,
		})
	}
	creditsBySlug = map
	return map
}

type TestimonialMeta = {
	author: string
	company?: string
	testimonial?: string
	imageId?: string
}
let testimonialsBySlug: Map<string, TestimonialMeta> | null = null
async function loadTestimonialsBySlug() {
	if (testimonialsBySlug) return testimonialsBySlug
	const root = getRepoRootDir()
	const filename = path.join(root, 'content', 'data', 'testimonials.yml')
	const raw = await fs.readFile(filename, 'utf8')
	const parsed = YAML.parse(raw)
	if (!Array.isArray(parsed)) {
		testimonialsBySlug = new Map()
		return testimonialsBySlug
	}

	const slugify = slugifyWithCounter()
	slugify.reset()
	const map = new Map<string, TestimonialMeta>()
	for (const t of parsed as Array<any>) {
		const author = typeof t?.author === 'string' ? t.author : 'Anonymous'
		const slug = slugify(author || 'anonymous')
		map.set(slug, {
			author,
			company: typeof t?.company === 'string' ? t.company : undefined,
			testimonial:
				typeof t?.testimonial === 'string' ? t.testimonial : undefined,
			imageId:
				typeof t?.imageId === 'string' ? t.imageId : undefined,
		})
	}
	testimonialsBySlug = map
	return map
}

type ResumeMeta = { title?: string; summary?: string }
let resumeMeta: ResumeMeta | null = null
async function loadResumeMeta() {
	if (resumeMeta) return resumeMeta
	const root = getRepoRootDir()
	const filename = path.join(root, 'content', 'data', 'resume.yml')
	const raw = await fs.readFile(filename, 'utf8')
	const parsed = YAML.parse(raw) as any

	const title =
		typeof parsed?.header?.title === 'string' ? parsed.header.title : undefined
	const summaryItem =
		typeof parsed?.summary?.short?.[0] === 'string'
			? parsed.summary.short[0]
			: typeof parsed?.summary?.long?.[0] === 'string'
				? parsed.summary.long[0]
				: undefined

	resumeMeta = { title, summary: summaryItem }
	return resumeMeta
}

function isSupportedRepoDocType(type: string): type is SupportedRepoDocType {
	return (
		type === 'blog' ||
		type === 'page' ||
		type === 'talk' ||
		type === 'resume' ||
		type === 'credit' ||
		type === 'testimonial'
	)
}

export async function getSemanticSearchPresentation(
	result: ResultLike,
): Promise<SemanticSearchPresentation> {
	const fallback = getFallbackPresentation(result.type)
	const fallbackImageUrl = fallback.imageUrl
	const fallbackImageAlt = fallback.imageAlt

	const summaryFromSnippet = result.snippet
		? truncate(result.snippet, 220)
		: undefined
	const base: SemanticSearchPresentation = {
		summary: summaryFromSnippet,
		imageUrl: result.imageUrl ?? fallbackImageUrl,
		imageAlt: result.imageAlt ?? fallbackImageAlt,
	}

	const type = result.type
	if (!type) return base
	const slug =
		result.slug ??
		inferSlugFromUrl({
			type,
			url:
				result.url ?? (typeof result.id === 'string' ? result.id : undefined),
		}) ??
		undefined

	// For most types, enrichment requires a doc slug. Resume is a special case
	// where we can enrich without a slug.
	if (!slug && type !== 'resume') return base

	// Blog/page: pull from MDX frontmatter.
	if (type === 'blog' || type === 'page') {
		if (!slug) return base
		const meta = await getMdxDocMeta({ type, slug })
		if (!meta) return base
		const summary = meta.summary ? truncate(meta.summary, 220) : base.summary
		const alt = meta.imageAlt ?? meta.title ?? result.title ?? fallback.imageAlt
		const imageUrl = meta.imageId
			? buildThumbFromImageId({
					imageId: meta.imageId,
					alt,
					size: 96,
				})
			: base.imageUrl
		return { summary, imageUrl, imageAlt: alt }
	}

	// YAML-backed repo docs.
	if (!isSupportedRepoDocType(type)) return base

	if (type === 'talk') {
		if (!slug) return base
		try {
			const talks = await loadTalksBySlug()
			const talk = talks.get(slug)
			if (!talk) return base
			const summary = talk.description
				? truncate(talk.description, 220)
				: base.summary
			return { ...base, summary }
		} catch {
			return base
		}
	}

	if (type === 'credit') {
		if (!slug) return base
		try {
			const credits = await loadCreditsBySlug()
			const person = credits.get(slug)
			if (!person) return base
			const summary = person.description
				? truncate(person.description, 220)
				: person.role
					? truncate(person.role, 220)
					: base.summary
			const alt = person.name || fallbackImageAlt
			const imageUrl = person.imageId
				? buildThumbFromImageId({
						imageId: person.imageId,
						alt,
						size: 96,
					})
				: fallbackImageUrl
			return { summary, imageUrl, imageAlt: alt }
		} catch {
			return base
		}
	}

	if (type === 'testimonial') {
		if (!slug) return base
		try {
			const testimonials = await loadTestimonialsBySlug()
			const t = testimonials.get(slug)
			if (!t) return base
			const summary = t.testimonial
				? truncate(t.testimonial, 220)
				: base.summary
			const alt = t.author || fallbackImageAlt
			const imageUrl = t.imageId
				? buildThumbFromImageId({
						imageId: t.imageId,
						alt,
						size: 96,
					})
				: fallbackImageUrl
			return { summary, imageUrl, imageAlt: alt }
		} catch {
			return base
		}
	}

	if (type === 'resume') {
		try {
			const resume = await loadResumeMeta()
			const summary = resume.summary
				? truncate(resume.summary, 220)
				: base.summary
			const alt = result.title ?? resume.title ?? fallbackImageAlt
			return { ...base, summary, imageAlt: alt }
		} catch {
			return base
		}
	}

	return base
}
