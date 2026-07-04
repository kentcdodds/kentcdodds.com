import { afterEach, describe, expect, test, vi } from 'vitest'
import {
	areCookiesAllowedForPageCache,
	buildPageCacheFillRequest,
	buildPageCacheKey,
	bumpPageCacheGeneration,
	clearPageCacheGenerationCache,
	clearPageCacheInFlightRevalidations,
	extractNonceFromCsp,
	getPageCacheGeneration,
	getThemeVariant,
	handlePageCacheRequest,
	isPageCacheServeEligible,
	isPageCacheStoreEligible,
	PAGE_CACHE_FRESH_TTL_SEC,
	PAGE_CACHE_GENERATION_MEMORY_TTL_MS,
	readPageCacheEntry,
	requestPrefersMarkdown,
	rewriteCachedEntryNonce,
	shouldBypassPageCachePath,
	sortSearchForCacheKey,
	writePageCacheEntry,
	type PageCacheEntry,
} from './page-cache.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'

afterEach(() => {
	clearPageCacheGenerationCache()
	clearPageCacheInFlightRevalidations()
	vi.useRealTimers()
})

function makeEnv(overrides: Partial<ParentWorkerEnv> = {}): ParentWorkerEnv {
	return {
		SITE_CACHE_KV: {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
		},
		CONTENT_KV: {
			get: vi.fn().mockResolvedValue('42'),
			put: vi.fn().mockResolvedValue(undefined),
		},
		...overrides,
	} as ParentWorkerEnv
}

describe('page cache key derivation', () => {
	test('includes generation, host, pathname, theme, and markdown variant', () => {
		const request = new Request('https://kentcdodds.com/blog', {
			headers: {
				cookie: 'en_theme=dark',
				accept: 'text/markdown, text/html;q=0.9',
			},
		})
		expect(buildPageCacheKey(request, '99')).toBe(
			'page-cache:99:kentcdodds.com:/blog:dark:1',
		)
	})

	test('sorts search params and uses none theme when cookie is absent', () => {
		const request = new Request('https://kentcdodds.com/search?z=1&a=2')
		expect(buildPageCacheKey(request, '1')).toBe(
			'page-cache:1:kentcdodds.com:/search?a=2&z=1:none:0',
		)
	})

	test('sortSearchForCacheKey normalizes query order', () => {
		expect(sortSearchForCacheKey('?b=2&a=1')).toBe('?a=1&b=2')
	})
})

describe('theme and markdown detection', () => {
	test('reads light and dark theme cookies', () => {
		expect(
			getThemeVariant(
				new Request('https://example.com/', {
					headers: { cookie: 'en_theme=light' },
				}),
			),
		).toBe('light')
		expect(
			getThemeVariant(
				new Request('https://example.com/', {
					headers: { cookie: 'en_theme=dark' },
				}),
			),
		).toBe('dark')
		expect(getThemeVariant(new Request('https://example.com/'))).toBe('none')
	})

	test('requestPrefersMarkdown mirrors bootstrap negotiation', () => {
		expect(requestPrefersMarkdown('text/markdown, text/html;q=0.9')).toBe(true)
		expect(requestPrefersMarkdown('text/html, text/markdown;q=0.8')).toBe(false)
	})
})

describe('serve eligibility', () => {
	test('bypasses session and auth-sensitive cookies', () => {
		const base = new Request('https://example.com/blog')
		expect(areCookiesAllowedForPageCache(base)).toBe(true)
		expect(
			areCookiesAllowedForPageCache(
				new Request('https://example.com/blog', {
					headers: { cookie: 'KCD_root_session=abc' },
				}),
			),
		).toBe(false)
		expect(
			areCookiesAllowedForPageCache(
				new Request('https://example.com/blog', {
					headers: { cookie: 'KCD_login=abc' },
				}),
			),
		).toBe(false)
		expect(
			areCookiesAllowedForPageCache(
				new Request('https://example.com/blog', {
					headers: { cookie: 'webauthn-challenge=abc' },
				}),
			),
		).toBe(false)
		expect(
			areCookiesAllowedForPageCache(
				new Request('https://example.com/blog', {
					headers: {
						cookie: 'en_theme=dark; KCD_client_id=client-1',
					},
				}),
			),
		).toBe(true)
	})

	test('bypasses protected paths and kill switch', () => {
		expect(shouldBypassPageCachePath('/me')).toBe(true)
		expect(shouldBypassPageCachePath('/action/mark-as-read')).toBe(true)
		expect(shouldBypassPageCachePath('/resources/search')).toBe(true)
		expect(shouldBypassPageCachePath('/blog')).toBe(false)

		const env = makeEnv({ PAGE_CACHE_DISABLED: 'true' })
		expect(
			isPageCacheServeEligible(new Request('https://example.com/blog'), env),
		).toBe(false)
	})
})

describe('store eligibility', () => {
	test('requires 200, no Set-Cookie, and allowed content types', () => {
		const html = new Response('<html></html>', {
			status: 200,
			headers: { 'content-type': 'text/html; charset=utf-8' },
		})
		expect(isPageCacheStoreEligible(html, '/blog')).toBe(true)

		const withCookie = new Response('<html></html>', {
			status: 200,
			headers: {
				'content-type': 'text/html',
				'Set-Cookie': 'a=b',
			},
		})
		expect(isPageCacheStoreEligible(withCookie, '/blog')).toBe(false)

		const jsonFeed = new Response('[]', {
			status: 200,
			headers: { 'content-type': 'application/json' },
		})
		expect(isPageCacheStoreEligible(jsonFeed, '/blog.json')).toBe(true)
		expect(isPageCacheStoreEligible(jsonFeed, '/search')).toBe(false)

		const markdown = new Response('# Title', {
			status: 200,
			headers: {
				'content-type': 'text/markdown',
				'content-security-policy': "script-src 'nonce-abc123'",
			},
		})
		expect(isPageCacheStoreEligible(markdown, '/blog/post')).toBe(true)
	})
})

describe('nonce rewrite', () => {
	test('rewrites body and CSP header consistently', () => {
		const entry: PageCacheEntry = {
			body: '<script nonce="abc123">x</script>',
			status: 200,
			headers: [
				[
					'content-security-policy',
					"script-src 'nonce-abc123' 'strict-dynamic'",
				],
			],
			nonce: 'abc123',
			storedAt: Date.now(),
		}
		const rewritten = rewriteCachedEntryNonce(entry, 'fresh456')
		expect(rewritten.body).toContain('nonce="fresh456"')
		expect(rewritten.headers[0]?.[1]).toContain("'nonce-fresh456'")
		expect(extractNonceFromCsp(rewritten.headers[0]?.[1])).toBe('fresh456')
	})
})

describe('generation cache', () => {
	test('caches generation reads for ~15 seconds', async () => {
		vi.useFakeTimers()
		const now = new Date('2026-07-04T00:00:00.000Z')
		vi.setSystemTime(now)

		const get = vi.fn().mockResolvedValue('7')
		const contentKv = { get }
		await expect(getPageCacheGeneration(contentKv)).resolves.toBe('7')
		await expect(getPageCacheGeneration(contentKv)).resolves.toBe('7')
		expect(get).toHaveBeenCalledTimes(1)

		vi.setSystemTime(new Date(now.getTime() + PAGE_CACHE_GENERATION_MEMORY_TTL_MS + 1))
		await expect(getPageCacheGeneration(contentKv)).resolves.toBe('7')
		expect(get).toHaveBeenCalledTimes(2)
	})

	test('bump updates memory cache immediately', async () => {
		const put = vi.fn().mockResolvedValue(undefined)
		const contentKv = { put }
		await bumpPageCacheGeneration(contentKv)
		const get = vi.fn()
		await expect(getPageCacheGeneration({ get })).resolves.toMatch(/^\d+$/)
		expect(get).not.toHaveBeenCalled()
	})
})

describe('SWR state machine', () => {
	test('serves HIT, STALE, and MISS with correct headers', async () => {
		vi.useFakeTimers()
		const now = Date.now()
		vi.setSystemTime(now)

		const freshEntry: PageCacheEntry = {
			body: '<html>fresh</html>',
			status: 200,
			headers: [['content-type', 'text/html']],
			nonce: '',
			storedAt: now - 60_000,
		}
		const staleEntry: PageCacheEntry = {
			...freshEntry,
			storedAt: now - (PAGE_CACHE_FRESH_TTL_SEC + 10) * 1000,
		}

		const kvGet = vi
			.fn()
			.mockResolvedValueOnce(JSON.stringify(freshEntry))
			.mockResolvedValueOnce(JSON.stringify(staleEntry))
			.mockResolvedValue(null)
		const kvPut = vi.fn().mockResolvedValue(undefined)
		const env = makeEnv({
			SITE_CACHE_KV: { get: kvGet, put: kvPut } as unknown as ParentWorkerEnv['SITE_CACHE_KV'],
			CONTENT_KV: { get: vi.fn().mockResolvedValue('1'), put: vi.fn() } as unknown as ParentWorkerEnv['CONTENT_KV'],
		})

		const fetchDynamic = vi.fn().mockResolvedValue(
			new Response('<html>live</html>', {
				status: 200,
				headers: { 'content-type': 'text/html' },
			}),
		)
		const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext

		const hit = await handlePageCacheRequest(
			new Request('https://example.com/blog'),
			env,
			ctx,
			fetchDynamic,
		)
		expect(hit.headers.get('X-Edge-Cache')).toBe('HIT')
		expect(await hit.text()).toBe('<html>fresh</html>')
		expect(fetchDynamic).not.toHaveBeenCalled()

		const stale = await handlePageCacheRequest(
			new Request('https://example.com/blog'),
			env,
			ctx,
			fetchDynamic,
		)
		expect(stale.headers.get('X-Edge-Cache')).toBe('STALE')
		expect(ctx.waitUntil).toHaveBeenCalled()

		const miss = await handlePageCacheRequest(
			new Request('https://example.com/blog'),
			env,
			ctx,
			fetchDynamic,
		)
		expect(miss.headers.get('X-Edge-Cache')).toBe('MISS')
		expect(fetchDynamic).toHaveBeenCalled()
	})

	test('fill request strips cookies except theme', async () => {
		const request = new Request('https://example.com/blog', {
			headers: {
				cookie: 'KCD_client_id=abc; en_theme=dark; other=1',
			},
		})
		const fill = buildPageCacheFillRequest(request)
		expect(fill.headers.get('Cookie')).toBe('en_theme=dark')
	})
})

describe('kv entry helpers', () => {
	test('round-trips cache entries through KV JSON', async () => {
		const entry: PageCacheEntry = {
			body: 'ok',
			status: 200,
			headers: [['content-type', 'text/plain']],
			nonce: '',
			storedAt: 1,
		}
		const stored = new Map<string, string>()
		const kv = {
			get: vi.fn(async (key: string) => stored.get(key) ?? null),
			put: vi.fn(async (key: string, value: string) => {
				stored.set(key, value)
			}),
		}

		await writePageCacheEntry(kv, 'page-cache:1', entry)
		await expect(readPageCacheEntry(kv, 'page-cache:1')).resolves.toEqual(entry)
	})
})
