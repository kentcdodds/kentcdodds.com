import { afterEach, describe, expect, test } from 'vitest'
import { getImageBuilder } from '#app/images.tsx'

const originalEnv = globalThis.ENV

describe('media image url generation', () => {
	afterEach(() => {
		globalThis.ENV = originalEnv
	})

	test('uses default media host when no override exists', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			MEDIA_BASE_URL: 'https://media.kentcdodds.com',
		}

		const builder = getImageBuilder('kent/profile')
		const url = builder()
		expect(url.startsWith('https://media.kentcdodds.com/')).toBe(true)
	})

	test('rewrites media host when public env override is set', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			MEDIA_BASE_URL: 'http://127.0.0.1:8803',
		}

		const builder = getImageBuilder('kent/profile')
		const url = builder()
		expect(url.startsWith('http://127.0.0.1:8803/')).toBe(true)
		expect(url).toContain('/images/')
	})
})
