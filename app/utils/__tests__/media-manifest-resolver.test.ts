import { describe, expect, test } from 'vitest'
import {
	normalizeMediaKey,
	resolveManifestAssetId,
	resolveMediaImageId,
	resolveMediaVideoId,
} from '../media-manifest-resolver.ts'

describe('media manifest resolver', () => {
	test('normalizeMediaKey trims content prefix and leading slashes', () => {
		expect(normalizeMediaKey('content/blog/post/image.png')).toBe(
			'blog/post/image.png',
		)
		expect(normalizeMediaKey('/content/blog/post/image.png')).toBe(
			'blog/post/image.png',
		)
		expect(
			normalizeMediaKey(
				'https://kentcdodds.com/content/blog/post/image.png?foo=bar',
			),
		).toBe('blog/post/image.png')
		expect(normalizeMediaKey('kentcdodds.com/content/blog/post/image.png')).toBe(
			'blog/post/image.png',
		)
	})

	test('resolveManifestAssetId resolves mapped ids', () => {
		const manifest = {
			version: 1,
			assets: {
				'blog/post/image.png': {
					id: 'cf-image-id',
					checksum: 'checksum',
					sourcePath: 'content/blog/post/image.png',
					uploadedAt: '2026-02-25T00:00:00.000Z',
				},
			},
		}
		expect(
			resolveManifestAssetId({
				manifest,
				mediaKey: 'content/blog/post/image.png',
			}),
		).toBe('cf-image-id')
		expect(
			resolveManifestAssetId({
				manifest,
				mediaKey: 'content/blog/post/image',
			}),
		).toBe('cf-image-id')
	})

	test('resolveManifestAssetId maps banner aliases to numbered files', () => {
		const manifest = {
			version: 1,
			assets: {
				'blog/post/0.png': {
					id: 'cf-banner-id',
					checksum: 'checksum',
					sourcePath: 'content/blog/post/0.png',
					uploadedAt: '2026-02-25T00:00:00.000Z',
				},
			},
		}
		expect(
			resolveManifestAssetId({
				manifest,
				mediaKey: 'kentcdodds.com/content/blog/post/banner',
			}),
		).toBe('cf-banner-id')
	})

	test('resolveManifestAssetId applies kentcdodds.com prefix fallback', () => {
		const manifest = {
			version: 1,
			assets: {
				'kentcdodds.com/illustrations/kody/kody_profile_gray': {
					id: 'cf-kody-gray',
					checksum: 'checksum',
					sourcePath:
						'content/kentcdodds.com/illustrations/kody/kody_profile_gray',
					uploadedAt: '2026-02-25T00:00:00.000Z',
				},
			},
		}
		expect(
			resolveManifestAssetId({
				manifest,
				mediaKey: 'illustrations/kody/kody_profile_gray',
			}),
		).toBe('cf-kody-gray')
	})

	test('resolveMediaImageId and resolveMediaVideoId fall back when missing', () => {
		expect(resolveMediaImageId('missing/profile-image')).toBe(
			'missing/profile-image',
		)
		expect(resolveMediaVideoId('missing/video-id')).toBe('missing/video-id')
	})

	test('handles undefined media keys without throwing', () => {
		expect(resolveMediaImageId(undefined)).toBe('')
		expect(resolveMediaVideoId(undefined)).toBe('')
	})
})
