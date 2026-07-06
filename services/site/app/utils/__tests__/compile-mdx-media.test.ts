import { describe, expect, test } from 'vitest'
import {
	parseCloudinaryPublicId,
	rewriteCloudinaryMediaUrl,
} from '../compile-mdx.server.ts'

describe('compile-mdx cloudinary media rewriting', () => {
	test('extracts public id from bare image URLs', () => {
		expect(
			parseCloudinaryPublicId(
				'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625033305/kentcdodds.com/content/blog/reacts-new-context-api/0.png',
			),
		).toEqual({
			resourceType: 'image',
			publicId: 'kentcdodds.com/content/blog/reacts-new-context-api/0.png',
		})
	})

	test('strips existing transform segments before rebuilding', () => {
		expect(
			parseCloudinaryPublicId(
				'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,b_rgb:e6e9ee/v1625032813/kentcdodds.com/content/blog/how-to-add-testing-to-an-existing-project/testing-trophy.png',
			)?.publicId,
		).toBe(
			'kentcdodds.com/content/blog/how-to-add-testing-to-an-existing-project/testing-trophy.png',
		)
	})

	test('rewrites images to host-relative /media URLs with default width', () => {
		expect(
			rewriteCloudinaryMediaUrl(
				'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625033305/kentcdodds.com/content/blog/reacts-new-context-api/0.png',
			),
		).toBe(
			'/media/w_1600/kentcdodds.com/content/blog/reacts-new-context-api/0.png',
		)
	})

	test('skips width transform for gif images', () => {
		expect(
			rewriteCloudinaryMediaUrl(
				'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625033311/kentcdodds.com/content/blog/rendering-a-function-with-react/0.gif',
			),
		).toBe(
			'/media/kentcdodds.com/content/blog/rendering-a-function-with-react/0.gif',
		)
	})

	test('rewrites video URLs without a transform segment', () => {
		expect(
			rewriteCloudinaryMediaUrl(
				'https://res.cloudinary.com/kentcdodds-com/video/upload/v1672334947/kentcdodds.com/content/blog/my-car-accident/all-good-here.mp4',
			),
		).toBe(
			'/media/kentcdodds.com/content/blog/my-car-accident/all-good-here.mp4',
		)
	})

	test('leaves layered composite Cloudinary URLs untouched', () => {
		const layeredUrl =
			'https://res.cloudinary.com/kentcdodds-com/image/upload/l_kentcdodds.com:illustrations/kody,kent/profile,fl_layer_apply,w_1200,h_630,c_fill/v1623175021/kentcdodds.com/blog/2010s-decade-in-review/social-preview.png'
		expect(parseCloudinaryPublicId(layeredUrl)).toBeNull()
		expect(rewriteCloudinaryMediaUrl(layeredUrl)).toBeUndefined()
	})

	test('leaves percent-encoded variable composite URLs untouched', () => {
		// Real shape from year-in-review posts: variable definitions ($th/$tw)
		// and l_text overlays, percent-encoded in the MDX source.
		const encodedComposite =
			'https://res.cloudinary.com/kentcdodds-com/image/upload/%24th_1256%2C%24tw_2400%2C%24gw_%24tw_div_24%2C%24gh_%24th_div_12/co_rgb%3Aa9adc1%2Cc_fit%2Cl_text%3Akentcdodds.com%3AMatter-Regular.woff2_50%3ACheck%2520this/c_fill%2Cw_%24tw%2Ch_%24th/kentcdodds.com/social-background.png'
		expect(parseCloudinaryPublicId(encodedComposite)).toBeNull()
		expect(rewriteCloudinaryMediaUrl(encodedComposite)).toBeUndefined()
	})
})
