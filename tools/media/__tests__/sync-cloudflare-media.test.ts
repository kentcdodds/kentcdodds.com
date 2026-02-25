import { expect, test } from 'vitest'
import {
	getMediaKey,
	getMediaKind,
	inferMimeType,
	isAllZerosSha,
	parseArgs,
} from '../sync-cloudflare-media.ts'

test('getMediaKind classifies images and videos', () => {
	expect(getMediaKind('content/blog/post/photo.png')).toBe('image')
	expect(getMediaKind('content/blog/post/clip.mp4')).toBe('video')
	expect(getMediaKind('content/blog/post/index.mdx')).toBeNull()
})

test('getMediaKey strips content prefix', () => {
	expect(getMediaKey('content/blog/post/photo.png')).toBe('blog/post/photo.png')
})

test('inferMimeType returns expected image and video mime types', () => {
	expect(inferMimeType('photo.jpg')).toBe('image/jpeg')
	expect(inferMimeType('clip.webm')).toBe('video/webm')
	expect(inferMimeType('other.bin')).toBe('application/octet-stream')
})

test('isAllZerosSha detects all-zero shas', () => {
	expect(isAllZerosSha('0000000000000000000')).toBe(true)
	expect(isAllZerosSha('abc000')).toBe(false)
	expect(isAllZerosSha(undefined)).toBe(false)
})

test('parseArgs parses workflow-style flags', () => {
	const parsed = parseArgs([
		'--before',
		'abc123',
		'--after',
		'def456',
		'--manifest-directory',
		'content/data/media-manifests',
		'--dry-run',
	])
	expect(parsed).toEqual({
		before: 'abc123',
		after: 'def456',
		dryRun: true,
		manifestDirectory: 'content/data/media-manifests',
	})
})
