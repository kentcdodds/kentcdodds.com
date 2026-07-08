import { describe, expect, test } from 'vitest'
import { getImageBuilder, getImgProps } from '../images.tsx'

describe('images buildMediaUrl integration', () => {
	test('maps fill-style crops to cover fit with derived height', () => {
		const builder = getImageBuilder('kent/profile', 'Kent C. Dodds')
		expect(builder({ fit: 'cover', aspectRatio: '4:3', width: 800 })).toBe(
			'/media/w_800,h_600,fit_cover/kent/profile',
		)
	})

	test('maps pad with background for letterboxed thumbs', () => {
		const builder = getImageBuilder('kentcdodds.com/testimonials/example', 'alt')
		expect(
			builder({
				fit: 'pad',
				background: 'e6e9ee',
				width: 100,
				height: 100,
			}),
		).toBe(
			'/media/w_100,h_100,fit_pad,bg_e6e9ee/kentcdodds.com/testimonials/example',
		)
	})

	test('builds LQIP blur placeholder shape', () => {
		const builder = getImageBuilder('unsplash/photo-123', 'alt')
		expect(builder({ width: 100, blur: 100, format: 'webp' })).toBe(
			'/media/w_100,blur_100,f_webp/unsplash/photo-123',
		)
	})

	test('getImgProps emits width-based srcset entries', () => {
		const builder = getImageBuilder('kent/profile', 'Kent')
		const props = getImgProps(builder, {
			widths: [400, 800],
			sizes: ['50vw'],
			transformations: { fit: 'cover', aspectRatio: '1:1' },
		})
		expect(props.src).toContain('/media/')
		expect(props.srcSet).toContain('400w')
		expect(props.srcSet).toContain('800w')
	})
})
