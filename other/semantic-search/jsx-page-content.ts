import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
import path from 'node:path'
import { toString as hastToString } from 'hast-util-to-string'
import getPort, { portNumbers } from 'get-port'
import rehypeParse from 'rehype-parse'
import { unified } from 'unified'
import { normalizeText } from './chunk-utils.ts'

export const JSX_HOME_SLUG = '__home__'

const SKIPPED_TAG_NAMES = new Set([
	'nav',
	'footer',
	'script',
	'style',
	'noscript',
	'svg',
	'template',
	'iframe',
])

const SKIPPED_CLASS_NAMES = new Set([
	'sr-only',
	'visually-hidden',
	'skip-link',
	'notification-message',
])

const SKIPPED_ROLES = new Set(['dialog', 'alert', 'status', 'navigation'])
const SKIPPED_STATIC_ROUTES = new Set([
	'/credits',
	'/resume',
	'/sitemap.xml',
	'/testimonials',
])
const SKIPPED_PREFIX_ROUTES = ['/blog/', '/calls/', '/chats/', '/talks/']
const NON_HTML_EXTENSION_PATTERN = /\.[a-z0-9]+$/i

export type JsxPageIndexItem = {
	slug: string
	title: string
	url: string
	source: string
}

function getClassList(value: unknown) {
	if (Array.isArray(value)) {
		return value.flatMap((v) =>
			typeof v === 'string' ? v.split(/\s+/).filter(Boolean) : [],
		)
	}
	if (typeof value === 'string') return value.split(/\s+/).filter(Boolean)
	return []
}

function hasSkippedClass(value: unknown) {
	const classList = getClassList(value)
	return classList.some((className) => SKIPPED_CLASS_NAMES.has(className))
}

function shouldSkipElement(node: any) {
	if (!node || node.type !== 'element') return false
	const tagName = String(node.tagName ?? '').toLowerCase()
	if (SKIPPED_TAG_NAMES.has(tagName)) return true

	const properties = (node.properties ?? {}) as Record<string, unknown>
	const role = String(properties.role ?? '').toLowerCase()
	if (role && SKIPPED_ROLES.has(role)) return true
	if (properties.hidden === true) return true
	if (String(properties['aria-hidden'] ?? '').toLowerCase() === 'true') return true
	if (hasSkippedClass(properties.className)) return true

	return false
}

function pruneNode(node: any): any | null {
	if (!node || typeof node !== 'object') return node
	if (shouldSkipElement(node)) return null

	const children = Array.isArray(node.children)
		? node.children
				.map((child: any) => pruneNode(child))
				.filter((child: any) => child != null)
		: undefined

	if (!children) return node
	return { ...node, children }
}

function findFirstElementByTagName(node: any, tagName: string): any | null {
	if (!node || typeof node !== 'object') return null
	if (node.type === 'element' && String(node.tagName ?? '').toLowerCase() === tagName)
		return node
	if (!Array.isArray(node.children)) return null
	for (const child of node.children) {
		const found = findFirstElementByTagName(child, tagName)
		if (found) return found
	}
	return null
}

export function normalizePathname(pathname: string) {
	const withoutQueryOrFragment = pathname.split(/[?#]/)[0] ?? ''
	if (!withoutQueryOrFragment.trim()) return '/'
	if (withoutQueryOrFragment === '/') return '/'
	return withoutQueryOrFragment.replace(/\/+$/, '') || '/'
}

export function parseSitemapPathnames(sitemapXml: string) {
	const pathnames: string[] = []
	const seen = new Set<string>()
	for (const match of sitemapXml.matchAll(/<loc>(?<loc>[^<]+)<\/loc>/g)) {
		const rawLoc = (match.groups?.loc ?? '').trim()
		if (!rawLoc) continue
		const decodedLoc = rawLoc.replace(/&amp;/g, '&')
		let pathname = decodedLoc
		try {
			pathname = new URL(decodedLoc).pathname
		} catch {
			// ignore invalid sitemap entries
		}
		const normalizedPathname = normalizePathname(pathname)
		if (seen.has(normalizedPathname)) continue
		seen.add(normalizedPathname)
		pathnames.push(normalizedPathname)
	}
	return pathnames
}

export async function getMdxPageRoutes(repoRoot = process.cwd()) {
	const pagesDir = path.join(repoRoot, 'content', 'pages')
	const files = await fs.readdir(pagesDir).catch(() => [])
	const routes = new Set<string>()
	for (const file of files) {
		if (!file.endsWith('.mdx')) continue
		routes.add(`/${file.replace(/\.mdx$/, '')}`)
	}
	return routes
}

export function shouldIndexJsxSitemapPath({
	pathname,
	mdxRoutes,
}: {
	pathname: string
	mdxRoutes: ReadonlySet<string>
}) {
	const normalizedPathname = normalizePathname(pathname)
	if (!normalizedPathname.startsWith('/')) return false
	if (NON_HTML_EXTENSION_PATTERN.test(normalizedPathname)) return false
	if (mdxRoutes.has(normalizedPathname)) return false
	if (SKIPPED_STATIC_ROUTES.has(normalizedPathname)) return false
	if (
		SKIPPED_PREFIX_ROUTES.some((prefix) => normalizedPathname.startsWith(prefix))
	) {
		return false
	}
	return true
}

export function getJsxPageSlugFromPath(pathname: string) {
	const normalizedPathname = normalizePathname(pathname)
	if (normalizedPathname === '/') return JSX_HOME_SLUG
	return normalizedPathname.slice(1)
}

export function getJsxPagePathFromSlug(slug: string) {
	if (slug === JSX_HOME_SLUG) return '/'
	return `/${slug.replace(/^\/+/, '')}`
}

export function extractRenderedPageContent(html: string) {
	const tree = unified().use(rehypeParse).parse(html)
	const titleNode = findFirstElementByTagName(tree, 'title')
	const title = normalizeText(titleNode ? hastToString(titleNode) : '')

	const pruned = pruneNode(tree)
	const bodyNode = findFirstElementByTagName(pruned, 'body')
	const text = normalizeText(hastToString(bodyNode ?? pruned))

	return { title, text }
}

type RunningDevServer = {
	origin: string
	close: () => Promise<void>
}

async function waitForSitemap({
	origin,
	logs,
	timeoutMs,
}: {
	origin: string
	logs: () => string
	timeoutMs: number
}) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(`${origin}/sitemap.xml`, {
				headers: { Accept: 'application/xml' },
			})
			if (res.ok) return
		} catch {
			// still starting
		}
		await sleep(750)
	}
	throw new Error(
		`Timed out waiting for local dev server at ${origin}. Recent logs:\n${logs()}`,
	)
}

export async function startLocalDevServerForSitemap({
	startupTimeoutMs = 180_000,
}: {
	startupTimeoutMs?: number
} = {}): Promise<RunningDevServer> {
	const port = await getPort({ port: portNumbers(3200, 3999) })
	const origin = `http://127.0.0.1:${port}`
	const child = spawn('npm', ['run', 'dev'], {
		cwd: process.cwd(),
		env: {
			...process.env,
			PORT: String(port),
			MOCKS: process.env.MOCKS ?? 'true',
			STARTUP_SHORTCUTS: 'false',
			FORCE_COLOR: '0',
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	})

	let outputLog = ''
	const appendOutput = (chunk: Buffer | string) => {
		outputLog += chunk.toString()
		if (outputLog.length > 200_000) {
			outputLog = outputLog.slice(-200_000)
		}
	}
	child.stdout?.on('data', appendOutput)
	child.stderr?.on('data', appendOutput)

	let settled = false
	const close = async () => {
		if (settled) return
		settled = true
		if (child.exitCode != null) return
		child.kill('SIGTERM')
		const deadline = Date.now() + 10_000
		while (child.exitCode == null && Date.now() < deadline) {
			await sleep(100)
		}
		if (child.exitCode == null) {
			child.kill('SIGKILL')
		}
	}

	try {
		await waitForSitemap({
			origin,
			logs: () => outputLog,
			timeoutMs: startupTimeoutMs,
		})
		return { origin, close }
	} catch (error) {
		await close()
		throw error
	}
}

async function fetchHtml(pathname: string, origin: string) {
	const res = await fetch(`${origin}${pathname}`, {
		redirect: 'manual',
		headers: { Accept: 'text/html,application/xhtml+xml' },
	})
	if (res.status >= 300 && res.status < 400) return null
	if (!res.ok) return null
	const contentType = res.headers.get('content-type') ?? ''
	if (!contentType.includes('text/html')) return null
	return await res.text()
}

export async function loadJsxPageItemsFromRunningSite({
	origin,
	mdxRoutes,
	minimumTextLength = 80,
}: {
	origin: string
	mdxRoutes: ReadonlySet<string>
	minimumTextLength?: number
}) {
	const sitemapRes = await fetch(`${origin}/sitemap.xml`, {
		headers: { Accept: 'application/xml' },
	})
	if (!sitemapRes.ok) {
		throw new Error(
			`Failed to fetch sitemap.xml from ${origin}: ${sitemapRes.status}`,
		)
	}

	const sitemapXml = await sitemapRes.text()
	const allPathnames = parseSitemapPathnames(sitemapXml)
	const pathnamesToIndex = allPathnames.filter((pathname) =>
		shouldIndexJsxSitemapPath({ pathname, mdxRoutes }),
	)

	const items: JsxPageIndexItem[] = []
	for (const pathname of pathnamesToIndex) {
		const html = await fetchHtml(pathname, origin)
		if (!html) continue
		const { title, text } = extractRenderedPageContent(html)
		if (text.length < minimumTextLength) continue
		const slug = getJsxPageSlugFromPath(pathname)
		items.push({
			slug,
			url: pathname,
			title: title || (pathname === '/' ? 'Home' : pathname),
			source: text,
		})
	}

	return items
}

export async function loadJsxPageItemsFromLocalApp() {
	const mdxRoutes = await getMdxPageRoutes()
	const server = await startLocalDevServerForSitemap()
	try {
		return await loadJsxPageItemsFromRunningSite({
			origin: server.origin,
			mdxRoutes,
		})
	} finally {
		await server.close()
	}
}
