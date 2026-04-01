import { expect, test, vi } from 'vitest'

vi.mock('../cache.server.ts', () => ({
	cache: {},
	cachified: async ({
		getFreshValue,
	}: {
		getFreshValue: (context: {}) => unknown
	}) => await getFreshValue({}),
}))

import {
	parseDescriptionMarkdown,
	parseSummaryMarkdown,
} from '../simplecast.server.ts'
import { getYouTubeVideoId } from '../youtube-utils.ts'

test('parseSummaryMarkdown extracts youtube video metadata section', async () => {
	const result = await parseSummaryMarkdown(
		`
Welcome to the episode summary.

### Video

[Watch the episode on YouTube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

### Resources

* [Docs](https://kentcdodds.com)
		`.trim(),
		'test-episode',
	)

	expect(result.youtubeVideoId).toBe('dQw4w9WgXcQ')
	expect(result.summaryHTML).toContain('<p>Welcome to the episode summary.</p>')
	expect(result.summaryHTML).not.toContain('Watch the episode on YouTube')
	expect(result.resources).toEqual([
		{ name: 'Docs', url: 'https://kentcdodds.com' },
	])
})

test('parseDescriptionMarkdown strips metadata-only youtube paragraphs with punctuation', async () => {
	const result = await parseDescriptionMarkdown(
		`
Lead-in description.

(https://www.youtube.com/watch?v=dQw4w9WgXcQ)
		`.trim(),
	)

	expect(result.youtubeVideoId).toBe('dQw4w9WgXcQ')
	expect(result.descriptionHTML).toContain('<p>Lead-in description.</p>')
	expect(result.descriptionHTML).not.toContain('dQw4w9WgXcQ')
})

test('parseDescriptionMarkdown keeps incidental youtube links in content as fallback', async () => {
	const result = await parseDescriptionMarkdown(
		`
Watch this recap on YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
		`.trim(),
	)

	expect(result.youtubeVideoId).toBe('dQw4w9WgXcQ')
	expect(result.descriptionHTML).toContain('Watch this recap on YouTube:')
	expect(result.descriptionHTML).toContain('dQw4w9WgXcQ')
})

test('getYouTubeVideoId supports common youtube url formats', () => {
	expect(getYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
	expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=43')).toBe(
		'dQw4w9WgXcQ',
	)
	expect(
		getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc'),
	).toBe('dQw4w9WgXcQ')
	expect(
		getYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share'),
	).toBe('dQw4w9WgXcQ')
	expect(getYouTubeVideoId('https://kentcdodds.com')).toBeNull()
})
