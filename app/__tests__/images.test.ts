import { afterEach, describe, expect, test } from 'vitest'
import { getImageBuilder } from '#app/images.tsx'

const originalEnv = globalThis.ENV

describe('cloudinary image url generation', () => {
	afterEach(() => {
		globalThis.ENV = originalEnv
	})

	test('uses default cloudinary host when no override exists', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			CLOUDINARY_BASE_URL: 'https://res.cloudinary.com',
		}

		const builder = getImageBuilder('kent/profile')
		const url = builder()
		expect(url.startsWith('https://res.cloudinary.com/')).toBe(true)
	})

	test('rewrites cloudinary host when public env override is set', () => {
		globalThis.ENV = {
			...(originalEnv ?? {}),
			CLOUDINARY_BASE_URL: 'http://127.0.0.1:8803',
		}

		const builder = getImageBuilder('kent/profile')
		const url = builder()
		expect(url.startsWith('http://127.0.0.1:8803/')).toBe(true)
		expect(url).toContain('/kentcdodds-com/image/upload/')
	})
})
