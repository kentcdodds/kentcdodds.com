import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const tinyPngBytes = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	),
	(c) => c.charCodeAt(0),
)

describe('resolveFeaturedImageDataUri', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(tinyPngBytes, { headers: { 'content-type': 'image/png' } })),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test('resolves /media transform URLs via bindings', async () => {
		const mediaPath =
			'/media/w_1200,h_1200,fit_pad/kentcdodds.com/illustrations/mic'
		const object = {
			body: new Blob([tinyPngBytes]).stream(),
			arrayBuffer: async () => tinyPngBytes.buffer,
			httpMetadata: { contentType: 'image/png' },
		}
		const transformedBytes = new Uint8Array([1, 2, 3, 4])
		const bucket = {
			head: vi.fn(async () => ({ size: tinyPngBytes.length })),
			get: vi.fn(async () => object),
		} as unknown as R2Bucket
		const images = {
			input: vi.fn(() => ({
				transform: vi.fn().mockReturnThis(),
				output: vi.fn(async () => ({
					response: () => new Response(transformedBytes),
					contentType: () => 'image/png',
				})),
			})),
		}

		const { resolveFeaturedImageDataUri } = await import('../assets.server.ts')
		const dataUri = await resolveFeaturedImageDataUri(mediaPath, {
			MEDIA_BUCKET: bucket,
			IMAGES: images,
		})

		expect(bucket.head).toHaveBeenCalled()
		expect(images.input).toHaveBeenCalled()
		expect(dataUri).toMatch(/^data:image\/png;base64,/)
	})

	test('rejects external featuredImage hosts outside the allowlist', async () => {
		const { resolveFeaturedImageDataUri } = await import('../assets.server.ts')
		await expect(
			resolveFeaturedImageDataUri('https://attacker.example/steal.png'),
		).rejects.toThrow(/host not allowed/)
		await expect(
			resolveFeaturedImageDataUri('http://www.gravatar.com/avatar/abc'),
		).rejects.toThrow(/must be https/)
		expect(fetch).not.toHaveBeenCalled()
	})

	test('allows gravatar avatar fetches and rejects other hosts', async () => {
		const { resolveAvatarDataUri } = await import('../assets.server.ts')
		const dataUri = await resolveAvatarDataUri({
			avatarKind: 'fetch',
			avatarSource: 'https://www.gravatar.com/avatar/abc?size=400',
			size: 400,
		})
		expect(dataUri).toMatch(/^data:image\/png;base64,/)

		await expect(
			resolveAvatarDataUri({
				avatarKind: 'fetch',
				avatarSource: 'https://internal.service.local/metadata',
				size: 400,
			}),
		).rejects.toThrow(/host not allowed/)
	})
})
