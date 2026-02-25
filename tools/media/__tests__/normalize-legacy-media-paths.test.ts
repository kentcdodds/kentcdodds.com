import { describe, expect, test } from 'vitest'
import {
	buildMediaReplacement,
	getDefaultImageTransforms,
	parseArgs,
	transformLegacyMediaPathsInText,
} from '../normalize-legacy-media-paths.ts'

describe('normalize legacy media paths', () => {
	test('buildMediaReplacement applies default image transforms when absent', () => {
		expect(
			buildMediaReplacement({
				kind: 'image',
				publicId: 'blog/example/photo.jpg',
			}),
		).toBe('/media/blog/example/photo.jpg?tr=f_auto,q_auto,dpr_2.0,w_1600')
		expect(
			buildMediaReplacement({
				kind: 'image',
				publicId: 'blog/example/animated.gif',
			}),
		).toBe('/media/blog/example/animated.gif?tr=f_auto,q_auto,w_1600')
	})

	test('buildMediaReplacement converts video paths to stream endpoints', () => {
		expect(
			buildMediaReplacement({
				kind: 'video',
				publicId: 'blog/example/clip',
			}),
		).toBe('/stream/blog/example/clip.mp4')
		expect(
			buildMediaReplacement({
				kind: 'video',
				publicId: 'blog/example/clip.webm',
				transforms: 'f_auto:video,q_auto',
			}),
		).toBe('/stream/blog/example/clip.webm?tr=f_auto:video,q_auto')
	})

	test('transformLegacyMediaPathsInText rewrites image and video upload paths', () => {
		const source = `
![img](/media/image/upload/w_600,q_auto/kentcdodds.com/content/blog/example/photo.jpg)
<video src="/media/video/upload/f_auto:video,q_auto/kentcdodds.com/content/blog/example/demo"></video>
`.trim()
		const { updatedSource, didChange } = transformLegacyMediaPathsInText(source)
		expect(didChange).toBe(true)
		expect(updatedSource).toContain(
			'/media/kentcdodds.com/content/blog/example/photo.jpg?tr=w_600,q_auto',
		)
		expect(updatedSource).toContain(
			'/stream/kentcdodds.com/content/blog/example/demo.mp4?tr=f_auto:video,q_auto',
		)
	})

	test('parseArgs handles dry-run and target directory flags', () => {
		expect(parseArgs(['--dry-run', '--target-directory', 'content/blog'])).toEqual(
			{
				dryRun: true,
				targetDirectory: 'content/blog',
			},
		)
	})

	test('getDefaultImageTransforms omits dpr for gifs', () => {
		expect(getDefaultImageTransforms('example.gif')).toBe('f_auto,q_auto,w_1600')
	})
})
