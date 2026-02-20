import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import getPort, { portNumbers } from 'get-port'
import { toString as hastToString } from 'hast-util-to-string'
import rehypeParse from 'rehype-parse'
import { unified } from 'unified'
import { mapWithConcurrency, normalizeText } from './chunk-utils.ts'

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
const BLOCK_LEVEL_TAG_NAMES = new Set([
	'address',
	'article',
	'aside',
	'blockquote',
	'dd',
	'details',
	'dialog',
	'div',
	'dl',
	'dt',
	'fieldset',
	'figcaption',
	'figure',
	'form',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'li',
	'main',
	'ol',
	'p',
	'pre',
	'section',
	'table',
	'tbody',
	'td',
	'tfoot',
	'th',
	'thead',
	'tr',
	'ul',
])

export type JsxPageIndexItem = {
	slug: string
	title: string
	url: string
	source: string
}

type HtmlFetchResult = {
	html: string
	pathname: string
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

function isJsxPageIndexItem(
	item: JsxPageIndexItem | null,
): item is JsxPageIndexItem {
	return item != null
}

function hasSkippedClass(value: unknown) {
	const classList = getClassList(value)
	return classList.some((className) => SKIPPED_CLASS_NAMES.has(className))
}

function extractReadableText(node: any): string {
	if (!node || typeof node !== 'object') return ''
	if (node.type === 'text') return String(node.value ?? '')
	if (node.type === 'element') {
		const tagName = String(node.tagName ?? '').toLowerCase()
		if (tagName === 'br' || tagName === 'hr') return '\n'
	}

	const children = Array.isArray(node.children) ? node.children : []
	const childText = children.map((child) => extractReadableText(child)).join('')
	if (!childText) return ''

	if (node.type !== 'element') return childText

	const tagName = String(node.tagName ?? '').toLowerCase()
	if (BLOCK_LEVEL_TAG_NAMES.has(tagName)) return `\n${childText}\n`
	return childText
}

function shouldSkipElement(node: any) {
	if (!node || node.type !== 'element') return false
	const tagName = String(node.tagName ?? '').toLowerCase()
	if (SKIPPED_TAG_NAMES.has(tagName)) return true

	const properties = (node.properties ?? {}) as Record<string, unknown>
	const role = String(properties.role ?? '').toLowerCase()
	const ariaHidden = properties.ariaHidden
	if (role && SKIPPED_ROLES.has(role)) return true
	if (properties.hidden === true) return true
	if (
		ariaHidden === true ||
		String(ariaHidden ?? '').toLowerCase() === 'true'
	) {
		return true
	}
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
	const routes = new Set<string>()

	const walk = async (dir: string, relativeDir = '') => {
		const entries = await fs.readdir(dir, { withFileTypes: true })
		for (const entry of entries) {
			const nextRelativePath = relativeDir
				? path.join(relativeDir, entry.name)
				: entry.name
			const nextAbsolutePath = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				await walk(nextAbsolutePath, nextRelativePath)
				continue
			}
			if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue
			routes.add(`/${nextRelativePath.replace(/\\/g, '/').replace(/\.mdx$/, '')}`)
		}
	}

	try {
		await walk(pagesDir)
	} catch {
		return new Set<string>()
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
	const text = normalizeText(extractReadableText(bodyNode ?? pruned)).replace(
		/\n{2,}/g,
		'\n',
	)

	return { title, text }
}

type RunningDevServer = {
	origin: string
	close: () => Promise<void>
}

type TextResponse = {
	statusCode: number
	headers: http.IncomingHttpHeaders
	body: string
}

async function requestTextDocument({
	url,
	accept,
}: {
	url: string
	accept: string
}): Promise<TextResponse> {
	const targetUrl = new URL(url)
	const requestFn = targetUrl.protocol === 'https:' ? https.request : http.request

	return await new Promise<TextResponse>((resolve, reject) => {
		const req = requestFn(
			targetUrl,
			{
				method: 'GET',
				maxHeaderSize: 1024 * 1024,
				headers: { Accept: accept },
			},
			(res) => {
				const chunks: Buffer[] = []
				res.on('data', (chunk) => {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
				})
				res.on('error', reject)
				res.on('end', () => {
					resolve({
						statusCode: res.statusCode ?? 0,
						headers: res.headers,
						body: Buffer.concat(chunks).toString('utf8'),
					})
				})
			},
		)
		req.on('error', reject)
		req.setTimeout(30_000, () => {
			req.destroy(new Error(`Request timed out: ${url}`))
		})
		req.end()
	})
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
			const res = await requestTextDocument({
				url: `${origin}/sitemap.xml`,
				accept: 'application/xml',
			})
			if (res.statusCode >= 200 && res.statusCode < 300) return
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
	const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
	const child = spawn(npmExecutable, ['run', 'dev'], {
		cwd: process.cwd(),
		env: {
			...process.env,
			PORT: String(port),
			MOCKS: process.env.MOCKS ?? 'true',
			STARTUP_SHORTCUTS: 'false',
			FORCE_COLOR: '0',
		},
		detached: process.platform !== 'win32',
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

	const waitForExit = () =>
		new Promise<void>((resolve) => {
			if (child.exitCode != null) {
				resolve()
				return
			}
			child.once('exit', () => resolve())
		})
	const killDevServer = (signal: NodeJS.Signals) => {
		if (process.platform !== 'win32' && child.pid) {
			process.kill(-child.pid, signal)
			return
		}
		child.kill(signal)
	}

	let settled = false
	const close = async () => {
		if (settled) return
		settled = true
		if (child.exitCode != null) return
		const exited = waitForExit()
		try {
			killDevServer('SIGTERM')
		} catch {
			// ignore if it already exited
		}
		const timedOut = await Promise.race([
			exited.then(() => false),
			sleep(10_000).then(() => true),
		])
		if (timedOut && child.exitCode == null) {
			try {
				killDevServer('SIGKILL')
			} catch {
				// ignore if it already exited
			}
			await exited
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

function getFirstHeaderValue(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0]
	return value
}

function getRedirectPathname({
	origin,
	currentPathname,
	locationHeader,
}: {
	origin: string
	currentPathname: string
	locationHeader: string
}) {
	try {
		const originUrl = new URL(origin)
		const currentUrl = new URL(currentPathname, originUrl)
		const redirectUrl = new URL(locationHeader, currentUrl)
		if (redirectUrl.origin !== originUrl.origin) return null
		const redirectPathname = `${redirectUrl.pathname}${redirectUrl.search}`
		if (!redirectPathname || redirectPathname === currentPathname) return null
		return redirectPathname
	} catch {
		return null
	}
}

async function fetchHtml(pathname: string, origin: string) {
	let currentPathname = pathname
	const seenPathnames = new Set<string>()

	for (let hop = 0; hop < 2; hop++) {
		if (seenPathnames.has(currentPathname)) return null
		seenPathnames.add(currentPathname)

		const res = await requestTextDocument({
			url: `${origin}${currentPathname}`,
			accept: 'text/html,application/xhtml+xml',
		})

		if (res.statusCode >= 300 && res.statusCode < 400 && hop === 0) {
			const locationHeader = getFirstHeaderValue(res.headers.location)
			if (!locationHeader) return null
			const redirectPathname = getRedirectPathname({
				origin,
				currentPathname,
				locationHeader,
			})
			if (!redirectPathname) return null
			currentPathname = redirectPathname
			continue
		}

		if (res.statusCode < 200 || res.statusCode >= 300) return null
		const contentType = String(res.headers['content-type'] ?? '')
		if (!contentType.includes('text/html')) return null
		return { html: res.body, pathname: currentPathname } satisfies HtmlFetchResult
	}

	return null
}

export async function loadJsxPageItemsFromRunningSite({
	origin,
	mdxRoutes,
	minimumTextLength = 120,
}: {
	origin: string
	mdxRoutes: ReadonlySet<string>
	minimumTextLength?: number
}) {
	const sitemapRes = await requestTextDocument({
		url: `${origin}/sitemap.xml`,
		accept: 'application/xml',
	})
	if (sitemapRes.statusCode < 200 || sitemapRes.statusCode >= 300) {
		throw new Error(
			`Failed to fetch sitemap.xml from ${origin}: ${sitemapRes.statusCode}`,
		)
	}

	const sitemapXml = sitemapRes.body
	const allPathnames = parseSitemapPathnames(sitemapXml)
	const pathnamesToIndex = allPathnames.filter((pathname) =>
		shouldIndexJsxSitemapPath({ pathname, mdxRoutes }),
	)

	const items = await mapWithConcurrency(
		pathnamesToIndex,
		5,
		async (pathname): Promise<JsxPageIndexItem | null> => {
			const normalizedOriginalPath = normalizePathname(pathname)
			const fetched = await fetchHtml(pathname, origin)
			if (!fetched) return null
			const { title, text } = extractRenderedPageContent(fetched.html)
			if (text.length < minimumTextLength) return null
			const slug = getJsxPageSlugFromPath(normalizedOriginalPath)
			return {
				slug,
				url: normalizedOriginalPath,
				title:
					title || (normalizedOriginalPath === '/' ? 'Home' : normalizedOriginalPath),
				source: text,
			}
		},
	)

	const uniqueBySlug = new Map<string, JsxPageIndexItem>()
	for (const item of items.filter(isJsxPageIndexItem)) {
		if (!uniqueBySlug.has(item.slug)) uniqueBySlug.set(item.slug, item)
	}
	return [...uniqueBySlug.values()]
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
