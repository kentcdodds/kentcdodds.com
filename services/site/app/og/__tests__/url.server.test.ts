import { describe, expect, test } from 'vitest'
import {
	buildOgImageCacheKey,
	buildOgImageUrl,
	verifyOgImageRequest,
} from '../url.server.ts'
import { ogTemplateRegistry } from '../registry.tsx'

const secret = 'test-og-secret'

describe('og url signing', () => {
	test('buildOgImageUrl produces verifiable signed URLs', () => {
		const url = buildOgImageUrl(
			'https://kentcdodds.com',
			'generic-social',
			{
				words: 'Hello world',
				url: 'kentcdodds.com',
				featuredImage: 'kentcdodds.com/illustrations/mic',
			},
			secret,
		)
		const parsed = new URL(url)
		expect(parsed.pathname).toBe('/resources/og-image')
		const verified = verifyOgImageRequest(parsed.searchParams, secret)
		expect(verified?.template).toBe('generic-social')
		expect(verified?.params).toMatchObject({ words: 'Hello world' })
	})

	test('rejects tampered signatures', () => {
		const url = buildOgImageUrl(
			'https://kentcdodds.com',
			'social-preview',
			{
				title: 'Title',
				preTitle: 'Pre',
				url: 'kentcdodds.com/blog',
				featuredImage: 'kent/profile',
			},
			secret,
		)
		const parsed = new URL(url)
		parsed.searchParams.set('sig', 'deadbeef'.repeat(8))
		expect(verifyOgImageRequest(parsed.searchParams, secret)).toBeNull()
	})

	test('cache key stays stable for identical payloads', () => {
		const params = {
			title: 'Episode',
			url: 'kentcdodds.com/calls/01/01',
			name: '- Kent',
			avatarKind: 'media' as const,
			avatarSource: 'kentcdodds.com/illustrations/kody/kody_profile_gray',
			avatarIsRound: false,
		}
		const a = buildOgImageCacheKey('call-kent-episode-art', params, secret)
		const b = buildOgImageCacheKey('call-kent-episode-art', params, secret)
		expect(a).toBe(b)
		expect(a.startsWith('og-image:')).toBe(true)
	})
})

describe('og registry schemas', () => {
	test('rejects oversized titles', () => {
		const result = ogTemplateRegistry['social-preview'].schema.safeParse({
			title: 'x'.repeat(201),
			preTitle: 'Pre',
			url: 'kentcdodds.com',
			featuredImage: 'kent/profile',
		})
		expect(result.success).toBe(false)
	})
})
