import { afterEach, describe, expect, test, vi } from 'vitest'
import {
	bufferReplacer,
	bufferReviver,
	decodeCacheEntry,
	encodeCacheEntry,
	getKvExpirationTtl,
} from './cache-encoding.ts'
import {
	deleteKvCacheLruEntry,
	getKvCacheLruEntry,
	setKvCacheLruEntry,
} from './rpc/kv-cache-lru.ts'
import {
	cacheArtifactBundle,
	clearArtifactBundleCache,
	getCachedArtifactBundle,
	getDocumentCodeFromBundle,
	getOrBuildModuleMap,
} from './artifact-bundle-cache.ts'
import {
	clearManifestCache,
	readMdxManifest,
	shouldBypassManifestCache,
} from './manifest.ts'
import {
	buildDynamicWorkerModuleMap,
	buildSiteContentData,
	type MdxArtifactBundle,
} from './module-map.ts'
import { mockRoutes, PASSTHROUGH_HOSTS } from './rpc/outbound-mock-routes.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'
import {
	getServiceBindingForHost,
	OAUTH_WORKER_HOST,
	SEARCH_WORKER_HOST,
} from './rpc/worker-service-routing.ts'
import { getAssetCacheControl, isHard404AssetPath } from './static-assets.ts'

afterEach(() => {
	clearManifestCache()
	clearArtifactBundleCache()
	vi.useRealTimers()
})

describe('manifest ttl', () => {
	test('caches manifest reads for ~15 seconds', async () => {
		vi.useFakeTimers()
		const now = new Date('2026-07-03T12:00:00.000Z')
		vi.setSystemTime(now)

		const get = vi
			.fn()
			.mockResolvedValue(
				JSON.stringify({ version: 'v1', r2Key: 'mdx-artifacts/v1.json' }),
			)

		const store = { get }
		await expect(readMdxManifest(store)).resolves.toEqual({
			version: 'v1',
			r2Key: 'mdx-artifacts/v1.json',
		})
		await expect(readMdxManifest(store)).resolves.toEqual({
			version: 'v1',
			r2Key: 'mdx-artifacts/v1.json',
		})
		expect(get).toHaveBeenCalledTimes(1)

		vi.setSystemTime(new Date(now.getTime() + 16_000))
		await expect(readMdxManifest(store)).resolves.toEqual({
			version: 'v1',
			r2Key: 'mdx-artifacts/v1.json',
		})
		expect(get).toHaveBeenCalledTimes(2)
	})

	test('bypasses cache on POST /action/refresh-cache', () => {
		expect(
			shouldBypassManifestCache(
				new Request('https://example.com/action/refresh-cache', {
					method: 'POST',
				}),
			),
		).toBe(true)
		expect(
			shouldBypassManifestCache(new Request('https://example.com/blog')),
		).toBe(false)
	})
})

describe('module map assembly', () => {
	test('builds shims, content data, nested MDX aliases, and per-document modules', () => {
		const bundle: MdxArtifactBundle = {
			schemaVersion: 1,
			version: 'abc',
			generatedAt: '2026-07-03T00:00:00.000Z',
			documents: {
				'blog/example': {
					contentDir: 'blog',
					slug: 'example',
					code: 'client-code',
					esm: 'export default function Example() { return null }',
				},
			},
			blogList: [{ slug: 'example' }],
			dirLists: { blog: [], pages: [] },
			dataFiles: { 'data/testimonials.yml': 'name: Kent' },
		}

		const contentData = buildSiteContentData(bundle)
		expect(contentData).not.toHaveProperty('blog')
		expect(contentData.documents['blog/example']).toEqual({
			contentDir: 'blog',
			slug: 'example',
		})
		expect(contentData.documents['blog/example']).not.toHaveProperty('code')

		const modules = buildDynamicWorkerModuleMap(bundle)
		expect(typeof modules['app-worker.js']).toBe('string')
		expect(modules.react).toEqual({ js: expect.any(String) })
		expect(modules['site-content-data.json']).toEqual({ json: contentData })
		expect(modules['mdx/blog/example.js']).toEqual({
			js: 'export default function Example() { return null }',
		})
		expect(modules['mdx/blog/react']).toEqual({ js: expect.any(String) })
		expect(modules['mdx/blog/react/jsx-runtime']).toEqual({
			js: expect.any(String),
		})
	})

	test('caches bundles and module maps by version', () => {
		const bundle: MdxArtifactBundle = {
			schemaVersion: 1,
			version: 'cache-test',
			generatedAt: '2026-07-03T00:00:00.000Z',
			documents: {
				'blog/example': {
					contentDir: 'blog',
					slug: 'example',
					code: 'client-code',
					esm: 'export default function Example() { return null }',
				},
			},
			blogList: [],
			dirLists: { blog: [], pages: [] },
			dataFiles: {},
		}

		cacheArtifactBundle(bundle.version, bundle)
		expect(getCachedArtifactBundle(bundle.version)).toBe(bundle)
		expect(getDocumentCodeFromBundle(bundle, 'blog', 'example')).toBe(
			'client-code',
		)

		const firstMap = getOrBuildModuleMap(bundle.version, bundle)
		const secondMap = getOrBuildModuleMap(bundle.version, bundle)
		expect(secondMap).toBe(firstMap)
	})
})

describe('cache encoding', () => {
	test('round-trips Buffer values through JSON encoding', () => {
		const entry = {
			metadata: {
				createdTime: Date.now(),
				ttl: 60_000,
				swr: 30_000,
			},
			value: {
				payload: Buffer.from('hello-cache'),
			},
		}

		const encoded = encodeCacheEntry(entry)
		const decoded = decodeCacheEntry(encoded)
		expect(decoded?.value).toEqual({ payload: Buffer.from('hello-cache') })
		expect(getKvExpirationTtl(entry)).toBeGreaterThanOrEqual(60)
	})

	test('buffer replacer and reviver are symmetric', () => {
		const original = { data: Buffer.from('abc') }
		const revived = JSON.parse(
			JSON.stringify(original, bufferReplacer),
			bufferReviver,
		)
		expect(revived.data.equals(Buffer.from('abc'))).toBe(true)
	})
})

describe('kv cache lru', () => {
	test('stores and retrieves entries with ttl metadata', () => {
		const key = `cache-test:${Date.now()}`
		const entry = {
			metadata: {
				createdTime: Date.now(),
				ttl: 60_000,
				swr: 30_000,
			},
			value: { ok: true },
		}

		setKvCacheLruEntry(key, entry)
		expect(getKvCacheLruEntry(key)).toEqual(entry)
		deleteKvCacheLruEntry(key)
		expect(getKvCacheLruEntry(key)).toBeNull()
	})
})

describe('static assets', () => {
	test('applies express-parity cache headers', () => {
		expect(getAssetCacheControl('/build/app.js')).toBe(
			'public, max-age=31536000, immutable',
		)
		expect(getAssetCacheControl('/build/info.json')).toBe('no-cache')
		expect(getAssetCacheControl('/images/foo.png')).toBe(
			'public, max-age=604800',
		)
	})

	test('hard 404s selected asset prefixes', () => {
		expect(isHard404AssetPath('/build/missing.js')).toBe(true)
		expect(isHard404AssetPath('/blog/missing')).toBe(false)
	})
})

describe('worker service routing', () => {
	test('routes oauth and search worker hostnames through service bindings', () => {
		const oauthBinding = { fetch: vi.fn() }
		const searchBinding = { fetch: vi.fn() }
		const env = {
			OAUTH_WORKER: oauthBinding,
			SEARCH_WORKER: searchBinding,
			SEARCH_WORKER_URL: `https://${SEARCH_WORKER_HOST}`,
		} as unknown as ParentWorkerEnv

		expect(getServiceBindingForHost(OAUTH_WORKER_HOST, env)).toBe(oauthBinding)
		expect(getServiceBindingForHost(SEARCH_WORKER_HOST, env)).toBe(
			searchBinding,
		)
		expect(getServiceBindingForHost('api.mailgun.net', env)).toBeUndefined()
	})
})

describe('outbound proxy routing', () => {
	test('marks public hosts as passthrough', () => {
		expect(PASSTHROUGH_HOSTS.has('api.twitter.com')).toBe(true)
		expect(PASSTHROUGH_HOSTS.has('api.mailgun.net')).toBe(false)
	})

	test('includes mailgun, kit, discord, and verifier mocks', () => {
		const hosts = new Set(mockRoutes.map((route) => route.host))
		expect(hosts).toEqual(
			new Set([
				'api.mailgun.net',
				'api.kit.com',
				'discord.com',
				'verifyright.co',
			]),
		)
	})
})
