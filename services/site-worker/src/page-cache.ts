import type { ParentWorkerEnv } from './rpc/types.ts'

export const PAGE_CACHE_GENERATION_KEY = 'page-cache:generation'

export const PAGE_CACHE_FRESH_TTL_SEC = 300
export const PAGE_CACHE_EXPIRATION_TTL_SEC = 26 * 60 * 60
export const PAGE_CACHE_GENERATION_MEMORY_TTL_MS = 15_000
export const PAGE_CACHE_KV_READ_CACHE_TTL_SEC = 30
export const PAGE_CACHE_GENERATION_HEADER = 'X-Page-Cache-Generation'
export const PAGE_CACHE_PREWARM_HEADER = 'X-Page-Cache-Prewarm'
export const PAGE_CACHE_PREWARM_CONTENT_VERSION_HEADER =
	'X-Page-Cache-Prewarm-Content-Version'
export const PAGE_CACHE_STORED_HEADER = 'X-Page-Cache-Stored'

const THEME_COOKIE_NAME = 'en_theme'
const SESSION_COOKIE_NAME = 'KCD_root_session'
const CLIENT_ID_COOKIE_NAME = 'KCD_client_id'
const LOGIN_COOKIE_NAME = 'KCD_login'
const WEBAUTHN_COOKIE_NAME = 'webauthn-challenge'
// D1 read-replication bookmark: routing/consistency metadata only, never
// rendered into HTML. Without allowlisting it, every D1-touching anonymous
// request would set it and BYPASS the page cache for its 10-minute lifetime.
const D1_BOOKMARK_COOKIE_NAME = 'kcd_d1_bookmark'

const ALLOWED_CACHE_COOKIES = new Set([
	THEME_COOKIE_NAME,
	CLIENT_ID_COOKIE_NAME,
	D1_BOOKMARK_COOKIE_NAME,
])
const BYPASS_CACHE_COOKIES = new Set([
	SESSION_COOKIE_NAME,
	LOGIN_COOKIE_NAME,
	WEBAUTHN_COOKIE_NAME,
])

const EXACT_BYPASS_PATHS = new Set([
	'/login',
	'/signup',
	'/logout',
	'/forgot-password',
	'/reset-password',
	'/magic',
	'/contact',
	'/healthcheck',
	'/__meta',
])

const BYPASS_PATH_PREFIXES = [
	'/me',
	'/cache',
	'/action/',
	'/resources/',
	'/oauth',
	'/mcp',
	'/discord',
	'/.well-known/',
] as const

const STOREABLE_CONTENT_TYPES = new Set([
	'text/html',
	'text/markdown',
	'application/rss+xml',
	'application/xml',
	'application/json',
])

const CACHEABLE_JSON_PATHS = new Set(['/blog.json', '/refresh-commit-sha.json'])

const CACHEABLE_XML_PATHS = new Set(['/sitemap.xml', '/blog/rss.xml'])

const STRIPPED_STORE_HEADERS = new Set([
	'set-cookie',
	'x-isolate-id',
	'x-cold-start-timing',
	'x-cache-stats',
	'x-d1-stats',
	'server-timing',
	'x-edge-cache',
	'age',
])

const markdownMediaType = 'text/markdown'

export type PageCacheEntry = {
	body: string
	status: number
	headers: Array<[string, string]>
	nonce: string
	storedAt: number
}

type GenerationCache = {
	value: string
	fetchedAt: number
}

let generationCache: GenerationCache | undefined
const inFlightRevalidations = new Map<string, Promise<void>>()

export function clearPageCacheGenerationCache() {
	generationCache = undefined
}

export function clearPageCacheInFlightRevalidations() {
	inFlightRevalidations.clear()
}

export function requestPrefersMarkdown(acceptHeader: string | null): boolean {
	if (!acceptHeader) return false
	const entries = acceptHeader
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
	let htmlQ = -1
	let markdownQ = -1
	for (const entry of entries) {
		const segments = entry.split(';').map((segment) => segment.trim())
		const type = segments[0]
		if (!type) continue
		const qParam = segments.find((segment) => segment.startsWith('q='))
		const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1
		if (type === 'text/html') htmlQ = q
		if (type === markdownMediaType) markdownQ = q
	}
	if (markdownQ < 0) return false
	if (htmlQ < 0) return true
	return markdownQ >= htmlQ
}

function parseCookieHeader(cookieHeader: string) {
	const cookies: Record<string, string> = {}
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim()
		if (!trimmed) continue
		const separator = trimmed.indexOf('=')
		if (separator <= 0) continue
		const name = trimmed.slice(0, separator).trim()
		const value = trimmed.slice(separator + 1).trim()
		cookies[name] = value
	}
	return cookies
}

export function getThemeVariant(request: Request): 'light' | 'dark' | 'none' {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return 'none'
	const theme = parseCookieHeader(cookieHeader)[THEME_COOKIE_NAME]
	if (theme === 'light' || theme === 'dark') return theme
	return 'none'
}

export function areCookiesAllowedForPageCache(request: Request): boolean {
	const cookieHeader = request.headers.get('Cookie')
	if (!cookieHeader) return true

	for (const name of Object.keys(parseCookieHeader(cookieHeader))) {
		if (BYPASS_CACHE_COOKIES.has(name)) return false
		if (!ALLOWED_CACHE_COOKIES.has(name)) return false
	}
	return true
}

export function shouldBypassPageCachePath(pathname: string): boolean {
	if (EXACT_BYPASS_PATHS.has(pathname)) return true

	for (const prefix of BYPASS_PATH_PREFIXES) {
		if (pathname === prefix || pathname.startsWith(prefix)) return true
	}

	if (pathname.startsWith('/calls/record')) return true
	if (pathname.startsWith('/calls/admin')) return true
	if (pathname.startsWith('/search/admin')) return true

	return false
}

export function isPageCacheDisabled(env: ParentWorkerEnv): boolean {
	return env.PAGE_CACHE_DISABLED === 'true'
}

export function isPageCacheServeEligible(
	request: Request,
	env: ParentWorkerEnv,
): boolean {
	if (isPageCacheDisabled(env)) return false
	if (request.method !== 'GET' && request.method !== 'HEAD') return false
	if (request.headers.get('Authorization')) return false

	const pathname = new URL(request.url).pathname
	if (shouldBypassPageCachePath(pathname)) return false
	if (!areCookiesAllowedForPageCache(request)) return false
	if (isClientPersonalizedPath(request, pathname)) return false

	return true
}

/**
 * Pages whose loaders render per-client state for anonymous visitors (keyed
 * by the KCD_client_id cookie): a visitor carrying a client id must not be
 * served the shared anonymous cache for these pages.
 *
 * - `/chats` episode pages: homework completion state.
 * - `/blog` index (and its `.data` request): `userReads` read-marks from
 *   `getSlugReadsByUser`.
 *
 * When adding a loader that resolves data via the client id, add its path
 * here or the page cache will serve one visitor's personalization to others.
 */
function isClientPersonalizedPath(request: Request, pathname: string) {
	const personalized =
		pathname.startsWith('/chats') ||
		pathname === '/blog' ||
		pathname === '/blog.data'
	if (!personalized) return false
	const cookieHeader = request.headers.get('Cookie')
	if (!cookieHeader) return false
	return CLIENT_ID_COOKIE_NAME in parseCookieHeader(cookieHeader)
}

/**
 * A visitor's own response may only be reused as the shared cache fill when
 * the request carried no body-influencing cookies. Any other cookie (in
 * practice KCD_client_id) can influence the rendered body — e.g. /blog
 * read-marks — and storing it would leak one visitor's personalization to
 * everyone. Such requests fill the cache via a cookie-stripped background
 * fetch instead. The theme cookie is part of the cache key and the D1
 * bookmark only affects replica routing, so both are store-safe.
 */
const STORE_SAFE_COOKIES = new Set([THEME_COOKIE_NAME, D1_BOOKMARK_COOKIE_NAME])

function canStoreOwnResponse(request: Request) {
	const cookieHeader = request.headers.get('Cookie')
	if (!cookieHeader) return true
	return Object.keys(parseCookieHeader(cookieHeader)).every((name) =>
		STORE_SAFE_COOKIES.has(name),
	)
}

function normalizeContentType(contentType: string | null) {
	return contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
}

export function isPageCacheStoreEligible(
	response: Response,
	pathname: string,
): boolean {
	if (response.status !== 200) return false
	if (response.headers.has('Set-Cookie')) return false

	const contentType = normalizeContentType(response.headers.get('content-type'))
	if (!STOREABLE_CONTENT_TYPES.has(contentType)) return false

	if (contentType === 'application/json') {
		return CACHEABLE_JSON_PATHS.has(pathname)
	}
	if (
		contentType === 'application/xml' ||
		contentType === 'application/rss+xml'
	) {
		return CACHEABLE_XML_PATHS.has(pathname)
	}

	return true
}

export function sortSearchForCacheKey(search: string): string {
	if (!search) return ''
	const params = new URLSearchParams(
		search.startsWith('?') ? search.slice(1) : search,
	)
	const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
	const serialized = new URLSearchParams(sorted).toString()
	return serialized ? `?${serialized}` : ''
}

export function buildPageCacheKey(
	request: Request,
	generation: string,
): string {
	const url = new URL(request.url)
	const theme = getThemeVariant(request)
	const md = requestPrefersMarkdown(request.headers.get('Accept')) ? '1' : '0'
	const search = sortSearchForCacheKey(url.search)
	return `page-cache:${generation}:${url.host}:${url.pathname}${search}:${theme}:${md}`
}

export async function getPageCacheGeneration(contentKv: {
	get(key: string): Promise<string | null>
}): Promise<string> {
	const now = Date.now()
	if (
		generationCache &&
		now - generationCache.fetchedAt < PAGE_CACHE_GENERATION_MEMORY_TTL_MS
	) {
		return generationCache.value
	}

	const raw = await contentKv.get(PAGE_CACHE_GENERATION_KEY)
	const value = raw ?? '0'
	generationCache = { value, fetchedAt: now }
	return value
}

export async function bumpPageCacheGeneration(contentKv: {
	put(key: string, value: string): Promise<unknown>
}) {
	const value = Date.now().toString()
	await contentKv.put(PAGE_CACHE_GENERATION_KEY, value)
	generationCache = { value, fetchedAt: Date.now() }
	return value
}

export function generatePageCacheNonce() {
	const bytes = new Uint8Array(16)
	crypto.getRandomValues(bytes)
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
		'',
	)
}

export function extractNonceFromCsp(csp: string | null | undefined) {
	if (!csp) return ''
	const match = csp.match(/'nonce-([^']+)'/)
	return match?.[1] ?? ''
}

export function rewriteCachedEntryNonce(
	entry: PageCacheEntry,
	freshNonce: string,
): PageCacheEntry {
	if (!entry.nonce) {
		return entry
	}

	return {
		...entry,
		body: entry.body.replaceAll(entry.nonce, freshNonce),
		headers: entry.headers.map(([name, value]) => {
			if (name.toLowerCase() === 'content-security-policy') {
				return [name, value.replaceAll(entry.nonce, freshNonce)] as [
					string,
					string,
				]
			}
			return [name, value]
		}),
		nonce: freshNonce,
	}
}

function buildThemeOnlyCookieHeader(request: Request) {
	const cookieHeader = request.headers.get('Cookie')
	if (!cookieHeader) return null
	const theme = parseCookieHeader(cookieHeader)[THEME_COOKIE_NAME]
	if (theme !== 'light' && theme !== 'dark') return null
	return `${THEME_COOKIE_NAME}=${theme}`
}

export function buildPageCacheFillRequest(request: Request) {
	const headers = new Headers(request.headers)
	headers.delete('Cookie')
	const themeCookie = buildThemeOnlyCookieHeader(request)
	if (themeCookie) {
		headers.set('Cookie', themeCookie)
	}
	// Background revalidations are not attributable to the triggering visitor:
	// drop client-IP headers so they rate-limit against a shared internal
	// bucket instead of consuming the visitor's quota.
	headers.delete('CF-Connecting-IP')
	return new Request(request.url, {
		// Always fill with GET: HEAD shares the cache key with GET, and a
		// HEAD-shaped fill would store an empty body that later GETs would be
		// served.
		method: 'GET',
		headers,
		redirect: 'manual',
	})
}

function headersToStore(response: Response) {
	const headers: Array<[string, string]> = []
	for (const [name, value] of response.headers.entries()) {
		if (STRIPPED_STORE_HEADERS.has(name.toLowerCase())) continue
		headers.push([name, value])
	}
	return headers
}

function encodePageCacheEntry(
	response: Response,
	body: string,
): PageCacheEntry | null {
	const headers = headersToStore(response)
	const contentType = normalizeContentType(response.headers.get('content-type'))
	const csp = headers.find(
		([name]) => name.toLowerCase() === 'content-security-policy',
	)?.[1]
	const nonce = extractNonceFromCsp(csp)
	if (contentType === 'text/html' && nonce && !body.includes(nonce)) {
		return null
	}

	return {
		body,
		status: response.status,
		headers,
		nonce: contentType === 'text/html' ? nonce : '',
		storedAt: Date.now(),
	}
}

export async function readPageCacheEntry(
	kv: {
		get(key: string, options?: { cacheTtl?: number }): Promise<string | null>
	},
	key: string,
): Promise<PageCacheEntry | null> {
	const raw = await kv.get(key, { cacheTtl: PAGE_CACHE_KV_READ_CACHE_TTL_SEC })
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw) as PageCacheEntry
		if (
			typeof parsed.body !== 'string' ||
			typeof parsed.status !== 'number' ||
			!Array.isArray(parsed.headers) ||
			typeof parsed.storedAt !== 'number'
		) {
			return null
		}
		return {
			...parsed,
			nonce: typeof parsed.nonce === 'string' ? parsed.nonce : '',
		}
	} catch {
		return null
	}
}

export async function writePageCacheEntry(
	kv: {
		put(
			key: string,
			value: string,
			options?: { expirationTtl?: number },
		): Promise<unknown>
	},
	key: string,
	entry: PageCacheEntry,
) {
	await kv.put(key, JSON.stringify(entry), {
		expirationTtl: PAGE_CACHE_EXPIRATION_TTL_SEC,
	})
}

function buildCachedResponse(
	request: Request,
	entry: PageCacheEntry,
	cacheStatus: 'HIT' | 'STALE',
	generation: string,
) {
	const ageSec = Math.max(0, Math.floor((Date.now() - entry.storedAt) / 1000))
	const freshNonce = entry.nonce ? generatePageCacheNonce() : ''
	const rewritten = freshNonce
		? rewriteCachedEntryNonce(entry, freshNonce)
		: entry
	const headers = new Headers(rewritten.headers)
	headers.set('X-Edge-Cache', cacheStatus)
	headers.set(PAGE_CACHE_GENERATION_HEADER, generation)
	headers.set('Age', String(ageSec))

	if (request.method === 'HEAD') {
		return new Response(null, {
			status: rewritten.status,
			headers,
		})
	}

	return new Response(rewritten.body, {
		status: rewritten.status,
		headers,
	})
}

function withEdgeCacheHeader(
	response: Response,
	status: 'MISS' | 'BYPASS',
	{
		generation,
		stored,
	}: {
		generation?: string
		stored?: boolean
	} = {},
) {
	const headers = new Headers(response.headers)
	headers.set('X-Edge-Cache', status)
	if (generation) headers.set(PAGE_CACHE_GENERATION_HEADER, generation)
	if (stored !== undefined) {
		headers.set(PAGE_CACHE_STORED_HEADER, stored ? 'true' : 'false')
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

async function storePageCacheFromFillResponse(
	key: string,
	fillResponse: Response,
	kv: ParentWorkerEnv['SITE_CACHE_KV'],
	pathname: string,
) {
	const body = await fillResponse.clone().text()
	const headers = new Headers(fillResponse.headers)
	headers.delete('Set-Cookie')
	const stripped = new Response(body, {
		status: fillResponse.status,
		statusText: fillResponse.statusText,
		headers,
	})
	if (!isPageCacheStoreEligible(stripped, pathname)) return false

	const entry = encodePageCacheEntry(stripped, body)
	if (!entry) return false
	await writePageCacheEntry(kv, key, entry)
	return true
}

async function revalidatePageCacheEntry(
	key: string,
	request: Request,
	env: ParentWorkerEnv,
	fetchDynamic: (request: Request) => Promise<Response>,
) {
	const existing = inFlightRevalidations.get(key)
	if (existing) return existing

	const promise = (async () => {
		const fillRequest = buildPageCacheFillRequest(request)
		const fillResponse = await fetchDynamic(fillRequest)
		const pathname = new URL(request.url).pathname
		await storePageCacheFromFillResponse(
			key,
			fillResponse,
			env.SITE_CACHE_KV,
			pathname,
		)
	})().finally(() => {
		inFlightRevalidations.delete(key)
	})

	inFlightRevalidations.set(key, promise)
	return promise
}

export async function handlePageCacheRequest(
	request: Request,
	env: ParentWorkerEnv,
	ctx: ExecutionContext,
	fetchDynamic: (request: Request) => Promise<Response>,
): Promise<Response> {
	if (!isPageCacheServeEligible(request, env)) {
		const response = await fetchDynamic(request)
		return withEdgeCacheHeader(response, 'BYPASS')
	}

	const generation = await getPageCacheGeneration(env.CONTENT_KV)
	const prewarmGeneration = request.headers.get(PAGE_CACHE_PREWARM_HEADER)
	if (prewarmGeneration && prewarmGeneration !== generation) {
		return new Response(null, {
			status: 409,
			headers: {
				'X-Edge-Cache': 'BYPASS',
				[PAGE_CACHE_GENERATION_HEADER]: generation,
			},
		})
	}
	const key = buildPageCacheKey(request, generation)
	// A prewarm must render the requested content version even if another
	// request filled this generation before the manifest propagated.
	const entry = prewarmGeneration
		? null
		: await readPageCacheEntry(env.SITE_CACHE_KV, key)
	const pathname = new URL(request.url).pathname

	if (entry) {
		const ageSec = Math.floor((Date.now() - entry.storedAt) / 1000)
		if (ageSec < PAGE_CACHE_FRESH_TTL_SEC) {
			return buildCachedResponse(request, entry, 'HIT', generation)
		}

		ctx.waitUntil(
			revalidatePageCacheEntry(key, request, env, fetchDynamic).catch(
				(error: unknown) => {
					console.warn('page-cache revalidation failed', key, error)
				},
			),
		)
		return buildCachedResponse(request, entry, 'STALE', generation)
	}

	// On a miss, fill the cache. When the request carried no cookies beyond
	// theme, the visitor's own response is safe to reuse as the shared fill
	// (a single dynamic fetch, a single rate-limit increment). Otherwise the
	// body may embed per-client personalization, so fill via a cookie-stripped
	// background fetch and never store the visitor's own response. HEAD
	// responses are never stored: they share the cache key with GET but have
	// empty bodies.
	const response = await fetchDynamic(request)
	if (request.method === 'GET') {
		if (canStoreOwnResponse(request)) {
			const responseForStore = response.clone()
			if (prewarmGeneration) {
				let stored = false
				try {
					stored = await storePageCacheFromFillResponse(
						key,
						responseForStore,
						env.SITE_CACHE_KV,
						pathname,
					)
				} catch (error: unknown) {
					console.warn('page-cache prewarm fill failed', key, error)
				}
				return withEdgeCacheHeader(response, 'MISS', { generation, stored })
			}
			ctx.waitUntil(
				storePageCacheFromFillResponse(
					key,
					responseForStore,
					env.SITE_CACHE_KV,
					pathname,
				).catch((error: unknown) => {
					console.warn('page-cache fill failed', key, error)
				}),
			)
		} else {
			ctx.waitUntil(
				revalidatePageCacheEntry(key, request, env, fetchDynamic).catch(
					(error: unknown) => {
						console.warn('page-cache fill failed', key, error)
					},
				),
			)
		}
	}

	return withEdgeCacheHeader(response, 'MISS', { generation })
}
