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

	test('rewrites images to absolute /media URLs with default width', () => {
		expect(
			rewriteCloudinaryMediaUrl(
				'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625033305/kentcdodds.com/content/blog/reacts-new-context-api/0.png',
			),
		).toBe(
			'https://kentcdodds.com/media/w_1600/kentcdodds.com/content/blog/reacts-new-context-api/0.png',
		)
	})

	test('skips width transform for gif images', () => {
		expect(
			rewriteCloudinaryMediaUrl(
				'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625033311/kentcdodds.com/content/blog/rendering-a-function-with-react/0.gif',
			),
		).toBe(
			'https://kentcdodds.com/media/kentcdodds.com/content/blog/rendering-a-function-with-react/0.gif',
		)
	})

	test('rewrites video URLs without a transform segment', () => {
		expect(
			rewriteCloudinaryMediaUrl(
				'https://res.cloudinary.com/kentcdodds-com/video/upload/v1672334947/kentcdodds.com/content/blog/my-car-accident/all-good-here.mp4',
			),
		).toBe(
			'https://kentcdodds.com/media/kentcdodds.com/content/blog/my-car-accident/all-good-here.mp4',
		)
	})
})
