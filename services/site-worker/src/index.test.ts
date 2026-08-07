import { afterEach, describe, expect, test, vi } from 'vitest'
import {
	bufferReplacer,
	bufferReviver,
	decodeCacheEntry,
	encodeCacheEntry,
	getKvExpirationTtl,
} from '../../site/app/utils/cache-encoding.server.ts'
import {
	deleteKvCacheLruEntry,
	getKvCacheLruEntry,
	setKvCacheLruEntry,
} from './rpc/kv-cache-lru.ts'
import {
	cacheArtifactBundle,
	clearArtifactBundleCache,
	fetchArtifactBundle,
	getCachedArtifactBundle,
	getDocumentCodeFromBundle,
	getOrBuildModuleMap,
} from './artifact-bundle-cache.ts'
import {
	getMdxBundleMirrorKey,
	getMdxCodeKey,
	stripBundleDocumentCode,
} from './artifact-kv-mirror.ts'
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
import { clearPageCacheGenerationCache } from './page-cache.ts'
import { handlePublishArtifacts } from './publish-artifacts.ts'
import { ContentRpc } from './rpc/content-rpc.ts'
import { PASSTHROUGH_HOSTS } from './rpc/outbound-mock-routes.ts'
import { OutboundProxy } from './rpc/outbound-proxy.ts'
import { maybeHandleOutboundMockFetch } from '../../site/app/utils/outbound-mock-handler.server.ts'
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
	clearPageCacheGenerationCache()
	vi.useRealTimers()
})

function createMemoryContentKv() {
	const store = new Map<string, string>()
	const putOrder: Array<string> = []
	return {
		store,
		putOrder,
		async get(key: string, options?: 'text' | 'json' | { type?: string }) {
			const value = store.get(key) ?? null
			if (value === null) return null
			const type = typeof options === 'string' ? options : options?.type
			return type === 'json' ? JSON.parse(value) : value
		},
		async put(key: string, value: string) {
			store.set(key, value)
			putOrder.push(key)
		},
	}
}

function createMemoryR2(initial: Record<string, string> = {}) {
	const store = new Map<string, string>(Object.entries(initial))
	return {
		store,
		async get(key: string) {
			const value = store.get(key)
			if (value === undefined) return null
			return { json: async () => JSON.parse(value) }
		},
		async put(key: string, value: string) {
			store.set(key, value)
		},
	}
}

function makeArtifactBundle(version: string): MdxArtifactBundle {
	return {
		schemaVersion: 1,
		version,
		generatedAt: '2026-07-03T00:00:00.000Z',
		documents: {
			'blog/example': {
				contentDir: 'blog',
				slug: 'example',
				code: `client-code-${version}`,
				esm: 'export default function Example() { return null }',
				githubResolvable: true,
				editLink:
					'https://github.com/kentcdodds/kentcdodds.com/edit/main/services/site/content/blog/example.mdx',
				frontmatter: { title: 'Example' },
			},
		},
		blogList: [],
		dirLists: { blog: [], pages: [] },
		dataFiles: {},
	}
}

function makeArtifactEnv(
	contentKv: ReturnType<typeof createMemoryContentKv>,
	r2: ReturnType<typeof createMemoryR2>,
	overrides: Record<string, unknown> = {},
) {
	return {
		CONTENT_KV: contentKv,
		MDX_ARTIFACTS: r2,
		...overrides,
	} as unknown as ParentWorkerEnv
}

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
	const exampleDocument = {
		contentDir: 'blog',
		slug: 'example',
		code: 'client-code',
		esm: 'export default function Example() { return null }',
		githubResolvable: true,
		editLink:
			'https://github.com/kentcdodds/kentcdodds.com/edit/main/services/site/content/blog/example.mdx',
		frontmatter: { title: 'Example' },
	} as const

	test('builds shims, content data, nested MDX aliases, and per-document modules', () => {
		const bundle: MdxArtifactBundle = {
			schemaVersion: 1,
			version: 'abc',
			generatedAt: '2026-07-03T00:00:00.000Z',
			documents: {
				'blog/example': exampleDocument,
			},
			blogList: [
				{
					slug: 'example',
					editLink: exampleDocument.editLink,
					frontmatter: exampleDocument.frontmatter,
				},
			],
			dirLists: { blog: [], pages: [] },
			dataFiles: { 'data/testimonials.yml': 'name: Kent' },
		}

		const contentData = buildSiteContentData(bundle)
		expect(contentData).not.toHaveProperty('blog')
		expect(contentData.documents['blog/example']).toEqual({
			contentDir: 'blog',
			slug: 'example',
			githubResolvable: true,
			editLink: exampleDocument.editLink,
			frontmatter: exampleDocument.frontmatter,
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
				'blog/example': exampleDocument,
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

describe('artifact kv mirror', () => {
	test('publish writes stripped mirror and per-doc code keys before flipping the manifest', async () => {
		const contentKv = createMemoryContentKv()
		const r2 = createMemoryR2()
		const env = makeArtifactEnv(contentKv, r2, {
			REFRESH_CACHE_SECRET: 'test-secret',
		})
		const bundle = makeArtifactBundle('v1')

		const response = await handlePublishArtifacts(
			new Request('https://example.com/resources/mdx-artifacts', {
				method: 'POST',
				headers: { auth: 'test-secret' },
				body: JSON.stringify(bundle),
			}),
			env,
		)
		expect(response.status).toBe(200)

		const r2Key = 'mdx-artifacts/v1.json'
		expect(JSON.parse(r2.store.get(r2Key) ?? '')).toEqual(bundle)

		const mirror = JSON.parse(
			contentKv.store.get(getMdxBundleMirrorKey(r2Key)) ?? '',
		)
		expect(mirror.documents['blog/example']).not.toHaveProperty('code')
		expect(mirror.documents['blog/example'].esm).toBe(
			bundle.documents['blog/example']?.esm,
		)

		const codeKey = getMdxCodeKey('v1', 'blog', 'example')
		expect(contentKv.store.get(codeKey)).toBe('client-code-v1')

		const manifestIndex = contentKv.putOrder.indexOf('mdx-manifest:current')
		expect(manifestIndex).toBeGreaterThan(-1)
		expect(contentKv.putOrder.indexOf(codeKey)).toBeLessThan(manifestIndex)
		expect(
			contentKv.putOrder.indexOf(getMdxBundleMirrorKey(r2Key)),
		).toBeLessThan(manifestIndex)
	})

	test('fetchArtifactBundle serves a legacy full mirror unchanged', async () => {
		const contentKv = createMemoryContentKv()
		const r2 = createMemoryR2()
		const env = makeArtifactEnv(contentKv, r2)
		const bundle = makeArtifactBundle('v2')
		const r2Key = 'mdx-artifacts/v2.json'
		contentKv.store.set(getMdxBundleMirrorKey(r2Key), JSON.stringify(bundle))

		const fetched = await fetchArtifactBundle(env, r2Key)
		expect(fetched?.documents['blog/example']?.code).toBe('client-code-v2')
		expect(contentKv.putOrder).toEqual([])
	})

	test('fetchArtifactBundle R2 fallback writes the stripped mirror and per-doc code keys', async () => {
		const contentKv = createMemoryContentKv()
		const bundle = makeArtifactBundle('v3')
		const r2Key = 'mdx-artifacts/v3.json'
		const r2 = createMemoryR2({ [r2Key]: JSON.stringify(bundle) })
		const env = makeArtifactEnv(contentKv, r2)

		const fetched = await fetchArtifactBundle(env, r2Key)
		expect(fetched?.documents['blog/example']?.code).toBe('client-code-v3')

		expect(contentKv.store.get(getMdxCodeKey('v3', 'blog', 'example'))).toBe(
			'client-code-v3',
		)
		const mirror = JSON.parse(
			contentKv.store.get(getMdxBundleMirrorKey(r2Key)) ?? '',
		)
		expect(mirror.documents['blog/example']).not.toHaveProperty('code')
	})
})

describe('document code resolution', () => {
	function makeContentRpc(env: ParentWorkerEnv) {
		return new ContentRpc({} as ExecutionContext, env)
	}

	function setManifest(
		contentKv: ReturnType<typeof createMemoryContentKv>,
		version: string,
	) {
		contentKv.store.set(
			'mdx-manifest:current',
			JSON.stringify({ version, r2Key: `mdx-artifacts/${version}.json` }),
		)
	}

	test('serves code inline from a legacy full bundle in parent memory', async () => {
		const contentKv = createMemoryContentKv()
		const r2 = createMemoryR2()
		setManifest(contentKv, 'legacy-v')
		cacheArtifactBundle('legacy-v', makeArtifactBundle('legacy-v'))
		const rpc = makeContentRpc(makeArtifactEnv(contentKv, r2))

		await expect(rpc.getDocumentCode('blog', 'example')).resolves.toBe(
			'client-code-legacy-v',
		)
	})

	test('reads the per-doc code key when the bundle is stripped', async () => {
		const contentKv = createMemoryContentKv()
		const r2 = createMemoryR2()
		setManifest(contentKv, 'stripped-v')
		cacheArtifactBundle(
			'stripped-v',
			stripBundleDocumentCode(makeArtifactBundle('stripped-v')),
		)
		contentKv.store.set(
			getMdxCodeKey('stripped-v', 'blog', 'example'),
			'client-code-stripped-v',
		)
		const rpc = makeContentRpc(makeArtifactEnv(contentKv, r2))

		await expect(rpc.getDocumentCode('blog', 'example')).resolves.toBe(
			'client-code-stripped-v',
		)
	})

	test('falls back to the full R2 bundle when the code key is missing, then serves from memory', async () => {
		const contentKv = createMemoryContentKv()
		const bundle = makeArtifactBundle('race-v')
		const r2 = createMemoryR2({
			'mdx-artifacts/race-v.json': JSON.stringify(bundle),
		})
		setManifest(contentKv, 'race-v')
		cacheArtifactBundle('race-v', stripBundleDocumentCode(bundle))
		const rpc = makeContentRpc(makeArtifactEnv(contentKv, r2))

		await expect(rpc.getDocumentCode('blog', 'example')).resolves.toBe(
			'client-code-race-v',
		)

		// Served from the parent-memory code cache on repeat requests: no
		// refetch even when the R2 object disappears.
		r2.store.delete('mdx-artifacts/race-v.json')
		await expect(rpc.getDocumentCode('blog', 'example')).resolves.toBe(
			'client-code-race-v',
		)
	})

	test('returns null for unknown documents without hitting R2 code fallback', async () => {
		const contentKv = createMemoryContentKv()
		const bundle = makeArtifactBundle('null-v')
		const r2 = createMemoryR2({
			'mdx-artifacts/null-v.json': JSON.stringify(bundle),
		})
		const r2Get = vi.spyOn(r2, 'get')
		setManifest(contentKv, 'null-v')
		cacheArtifactBundle('null-v', stripBundleDocumentCode(bundle))
		const rpc = makeContentRpc(makeArtifactEnv(contentKv, r2))

		await expect(rpc.getDocumentCode('blog', 'missing')).resolves.toBeNull()
		expect(r2Get).not.toHaveBeenCalled()
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
		expect(getServiceBindingForHost('api.cloudflare.com', env)).toBeUndefined()
	})
})

describe('outbound proxy routing', () => {
	test('marks public hosts as passthrough', () => {
		expect(PASSTHROUGH_HOSTS.has('cdn.syndication.twimg.com')).toBe(true)
		expect(PASSTHROUGH_HOSTS.has('api.cloudflare.com')).toBe(false)
	})

	test('includes email, kit, discord, and verifier mocks', async () => {
		const hosts = [
			'api.cloudflare.com',
			'api.kit.com',
			'discord.com',
			'verifyright.co',
			'www.gravatar.com',
		] as const
		const sampleRequests: Record<(typeof hosts)[number], Request> = {
			'api.cloudflare.com': new Request(
				'https://api.cloudflare.com/client/v4/accounts/test/email/sending/send',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ to: 'test@example.com', text: 'hi' }),
				},
			),
			'api.kit.com': new Request('https://api.kit.com/v3/subscribers'),
			'discord.com': new Request('https://discord.com/api/oauth2/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: 'id',
					client_secret: 'secret',
					grant_type: 'authorization_code',
					redirect_uri: 'https://example.com/callback',
					scope: 'identify',
				}),
			}),
			'verifyright.co': new Request(
				'https://verifyright.co/verify/test@example.com',
			),
			'www.gravatar.com': new Request('https://www.gravatar.com/avatar/abc', {
				method: 'HEAD',
			}),
		}
		for (const host of hosts) {
			const response = await maybeHandleOutboundMockFetch(sampleRequests[host])
			expect(response, `expected mock for ${host}`).not.toBeNull()
		}
	})

	test('production (OUTBOUND_MOCKS unset) passes third-party hosts through', async () => {
		const realFetch = globalThis.fetch
		const fetchSpy = vi.fn(async () => new Response('real-api'))
		globalThis.fetch = fetchSpy as unknown as typeof fetch
		try {
			const proxy = new OutboundProxy(
				{} as never,
				{ BUILD_SHA: 'test', COMPATIBILITY_DATE: 'test' } as never,
			)
			const response = await proxy.fetch(
				new Request('https://api.transistor.fm/v1/episodes', {
					headers: { 'x-api-key': 'real-key' },
				}),
			)
			expect(fetchSpy).toHaveBeenCalledTimes(1)
			expect(await response.text()).toBe('real-api')
		} finally {
			globalThis.fetch = realFetch
		}
	})

	test('OUTBOUND_MOCKS=true serves mocks instead of fetching', async () => {
		const realFetch = globalThis.fetch
		const fetchSpy = vi.fn(async () => new Response('real-api'))
		globalThis.fetch = fetchSpy as unknown as typeof fetch
		try {
			const proxy = new OutboundProxy(
				{} as never,
				{
					BUILD_SHA: 'test',
					COMPATIBILITY_DATE: 'test',
					OUTBOUND_MOCKS: 'true',
				} as never,
			)
			const response = await proxy.fetch(
				new Request('https://api.transistor.fm/v1/episodes', {
					headers: { 'x-api-key': 'mock-key' },
				}),
			)
			expect(fetchSpy).not.toHaveBeenCalled()
			expect(response.status).toBe(200)
		} finally {
			globalThis.fetch = realFetch
		}
	})
})
