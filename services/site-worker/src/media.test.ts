import { describe, expect, test, vi } from 'vitest'
import {
	buildImageTransformOptions,
	getMediaCacheKey,
	isMp4Magic,
	isVideoContent,
	mapMediaGravity,
	normalizeBackgroundColor,
	resolveOutputFormat,
	sniffImageContentType,
	validateMediaTransform,
} from '../../site/app/utils/media-serving.server.ts'
import { parseMediaPath } from '../../site/app/utils/media.ts'
import { handleMediaRequest } from './media.ts'

describe('parseMediaPath', () => {
	test('parses transform segment and asset id', () => {
		expect(
			parseMediaPath('/media/w_800,h_600,fit_cover/kent/profile'),
		).toEqual({
			id: 'kent/profile',
			transform: {
				width: 800,
				height: 600,
				fit: 'cover',
			},
		})
	})

	test('parses bare asset id without transform', () => {
		expect(parseMediaPath('/media/kent/profile')).toEqual({
			id: 'kent/profile',
			transform: undefined,
		})
	})
})

describe('media helpers', () => {
	test('detects mp4 magic bytes', () => {
		const bytes = new Uint8Array(12)
		bytes.set([0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70], 0)
		expect(isMp4Magic(bytes)).toBe(true)
	})

	test('sniffs jpeg magic bytes', () => {
		const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00])
		expect(sniffImageContentType(bytes)).toBe('image/jpeg')
	})

	test('maps face gravity to auto', () => {
		expect(mapMediaGravity('face')).toBe('auto')
		expect(mapMediaGravity('left')).toBe('left')
	})

	test('prefixes bare hex background colors', () => {
		expect(normalizeBackgroundColor('e6e9ee')).toBe('#e6e9ee')
		expect(normalizeBackgroundColor('#fff')).toBe('#fff')
	})

	test('rejects oversized dimensions and blur', () => {
		expect(validateMediaTransform({ width: 5000 })).toEqual({
			ok: false,
			error: 'width exceeds maximum of 4096',
		})
		expect(validateMediaTransform({ blur: 300 })).toEqual({
			ok: false,
			error: 'blur exceeds maximum of 250',
		})
	})

	test('negotiates avif and webp from Accept', () => {
		expect(
			resolveOutputFormat({
				transform: { format: 'auto' },
				acceptHeader: 'image/avif,image/webp,*/*',
				isGif: false,
				originalFormat: 'image/jpeg',
			}),
		).toEqual({ format: 'image/avif', negotiated: true })

		expect(
			resolveOutputFormat({
				transform: undefined,
				acceptHeader: 'image/webp,*/*',
				isGif: true,
				originalFormat: 'image/gif',
			}),
		).toEqual({ format: 'image/webp', negotiated: true })
	})

	test('keeps gif when webp is not accepted', () => {
		expect(
			resolveOutputFormat({
				transform: { format: 'auto' },
				acceptHeader: 'image/*,*/*',
				isGif: true,
				originalFormat: 'image/gif',
			}),
		).toEqual({ format: 'image/gif', negotiated: false })
	})

	test('builds image transform options with clamped blur', () => {
		expect(
			buildImageTransformOptions({
				width: 400,
				height: 300,
				fit: 'cover',
				gravity: 'auto',
				background: 'ffffff',
				blur: 12,
			}),
		).toEqual({
			width: 400,
			height: 300,
			fit: 'cover',
			gravity: 'auto',
			background: '#ffffff',
			blur: 12,
		})
	})

	test('classifies video by content type and extension', () => {
		expect(
			isVideoContent({
				contentType: 'video/mp4',
				id: 'clip',
			}),
		).toBe(true)
		expect(
			isVideoContent({
				contentType: undefined,
				id: 'clip.mp4',
			}),
		).toBe(true)
	})
})

describe('handleMediaRequest', () => {
	test('returns 405 for unsupported methods', async () => {
		const response = await handleMediaRequest(
			new Request('https://example.com/media/kent/profile', {
				method: 'POST',
			}),
			{ MEDIA_BUCKET: {} as R2Bucket, IMAGES: {} as never },
			{ waitUntil: vi.fn() } as unknown as ExecutionContext,
		)
		expect(response.status).toBe(405)
	})

	test('returns 404 for missing media objects', async () => {
		const bucket = {
			head: vi.fn(async () => null),
		} as unknown as R2Bucket
		const response = await handleMediaRequest(
			new Request('https://example.com/media/missing.png'),
			{ MEDIA_BUCKET: bucket, IMAGES: {} as never },
			{ waitUntil: vi.fn() } as unknown as ExecutionContext,
		)
		expect(response.status).toBe(404)
		expect(response.headers.get('cache-control')).toContain('max-age=60')
	})

	test('returns 400 for invalid transform dimensions', async () => {
		const response = await handleMediaRequest(
			new Request('https://example.com/media/w_5000/kent/profile'),
			{ MEDIA_BUCKET: {} as R2Bucket, IMAGES: {} as never },
			{ waitUntil: vi.fn() } as unknown as ExecutionContext,
		)
		expect(response.status).toBe(400)
	})

	test('ranged video requests bypass the edge cache and return 206', async () => {
		const videoBytes = new Uint8Array(1000)
		videoBytes.set([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70], 0)
		const bucket = {
			head: vi.fn(async () => ({
				size: videoBytes.length,
				httpMetadata: { contentType: 'video/mp4' },
			})),
			get: vi.fn(
				async (_key: string, options?: { range?: { offset: number; length: number } }) => {
					const range = options?.range
					const slice = range
						? videoBytes.slice(range.offset, range.offset + range.length)
						: videoBytes
					return {
						body: new Blob([slice]).stream(),
						size: slice.length,
						httpMetadata: { contentType: 'video/mp4' },
						etag: 'etag',
						arrayBuffer: async () => slice.buffer,
					}
				},
			),
		} as unknown as R2Bucket
		const cacheMatch = vi.fn(async () => new Response('cached-full-body'))
		const cachesStub = { default: { match: cacheMatch, put: vi.fn() } }
		const originalCaches = (globalThis as { caches?: unknown }).caches
		;(globalThis as { caches?: unknown }).caches = cachesStub
		try {
			const response = await handleMediaRequest(
				new Request('https://example.com/media/kentcdodds.com/misc/facepalm', {
					headers: { Range: 'bytes=0-99' },
				}),
				{ MEDIA_BUCKET: bucket, IMAGES: {} as never },
				{ waitUntil: vi.fn() } as unknown as ExecutionContext,
			)
			expect(cacheMatch).not.toHaveBeenCalled()
			expect(response.status).toBe(206)
			expect(response.headers.get('content-range')).toBe('bytes 0-99/1000')
			expect(response.headers.get('content-length')).toBe('100')
		} finally {
			;(globalThis as { caches?: unknown }).caches = originalCaches
		}
	})
})

describe('svg passthrough', () => {
	test('detects svg by magic bytes', () => {
		const svg = new TextEncoder().encode('<svg width="214"')
		const xml = new TextEncoder().encode('<?xml version="1"')
		const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
		expect(sniffImageContentType(svg)).toBe('image/svg+xml')
		expect(sniffImageContentType(xml)).toBe('image/svg+xml')
		expect(sniffImageContentType(jpeg)).toBe('image/jpeg')
	})
})

describe('getMediaCacheKey', () => {
	// The Workers Cache API ignores Vary, so the Accept class must be
	// encoded into the cache-key URL for format-negotiated transforms.
	test('separates avif, webp, and base Accept classes', () => {
		const transform = { width: 800 }
		const keyFor = (accept?: string) =>
			getMediaCacheKey(
				new Request('https://example.com/media/w_800/kent/profile', {
					headers: accept ? { Accept: accept } : undefined,
				}),
				transform,
			).url
		const avif = keyFor('image/avif,image/webp,*/*')
		const webp = keyFor('image/webp,*/*')
		const base = keyFor('*/*')
		expect(avif).toContain('__accept=avif')
		expect(webp).toContain('__accept=webp')
		expect(base).toContain('__accept=base')
		expect(new Set([avif, webp, base]).size).toBe(3)
	})

	test('does not vary the key when format is explicit', () => {
		const key = getMediaCacheKey(
			new Request('https://example.com/media/w_100,f_webp/kent/profile', {
				headers: { Accept: 'image/avif' },
			}),
			{ width: 100, format: 'webp' },
		)
		expect(key.url).not.toContain('__accept')
	})
})
