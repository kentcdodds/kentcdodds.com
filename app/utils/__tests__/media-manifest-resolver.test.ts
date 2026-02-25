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
	})

	test('resolveMediaImageId and resolveMediaVideoId fall back when missing', () => {
		expect(resolveMediaImageId('kent/profile')).toBe('kent/profile')
		expect(resolveMediaVideoId('kent/video-id')).toBe('kent/video-id')
	})
})
