import { afterEach, describe, expect, test } from 'vitest'
import {
	getGenericSocialImage,
	getImageBuilder,
	getSocialImageWithPreTitle,
} from '#app/images.tsx'

const originalEnv = globalThis.ENV

describe('media image url generation', () => {
	afterEach(() => {
		globalThis.ENV = originalEnv
	})

	test('uses default media host when no override exists', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			MEDIA_BASE_URL: 'https://media.kcd.dev',
		}

		const builder = getImageBuilder('kent/profile')
		const url = builder()
		expect(url.startsWith('https://media.kcd.dev/')).toBe(true)
	})

	test('rewrites media host when public env override is set', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			MEDIA_BASE_URL: 'http://localhost:8803',
		}

		const builder = getImageBuilder('kent/profile')
		const url = builder()
		expect(url.startsWith('http://localhost:8803/')).toBe(true)
		expect(url).toContain('/images/')
	})

	test('uses media images base override when provided', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			MEDIA_BASE_URL: 'https://media.kcd.dev',
			MEDIA_IMAGES_BASE_URL: 'https://example.com/images',
		}

		const builder = getImageBuilder('kent/profile')
		const url = builder()
		expect(url.startsWith('https://example.com/images/')).toBe(true)
	})

	test('generic social images use media social endpoint', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			MEDIA_BASE_URL: 'http://localhost:8803',
		}
		const url = getGenericSocialImage({
			words: 'Hello world',
			featuredImage: 'kent/profile',
			url: 'kentcdodds.com/blog',
		})
		expect(url.startsWith('http://localhost:8803/social/generic.png')).toBe(
			true,
		)
	})

	test('pre-title social images use media social endpoint', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			MEDIA_BASE_URL: 'http://localhost:8803',
		}
		const url = getSocialImageWithPreTitle({
			title: 'A title',
			preTitle: 'A pre-title',
			featuredImage: 'kent/profile',
			url: 'kentcdodds.com/blog/my-post',
		})
		expect(
			url.startsWith('http://localhost:8803/social/pre-title.png'),
		).toBe(true)
	})
})
