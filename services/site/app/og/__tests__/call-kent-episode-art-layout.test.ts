import { describe, expect, test } from 'vitest'
import {
	CALL_KENT_EPISODE_ART_DESIGN_SIZE,
	CALL_KENT_EPISODE_ART_GRID_DIVISIONS,
	computeCallKentEpisodeArtLayout,
	countCallKentEpisodeArtTitleLines,
} from '../call-kent-episode-art-layout.ts'

const CANVAS = 1400

describe('computeCallKentEpisodeArtLayout', () => {
	test('uses a 12-column grid scaled to canvas size', () => {
		const g = CANVAS / CALL_KENT_EPISODE_ART_GRID_DIVISIONS
		const layout = computeCallKentEpisodeArtLayout(CANVAS, 'Podcast breaks')

		expect(layout.g).toBeCloseTo(g)
		expect(layout.canvasSize).toBe(CANVAS)
	})

	test('matches Cloudinary font scaling at 1400px', () => {
		const layout = computeCallKentEpisodeArtLayout(CANVAS, 'Podcast breaks')

		expect(layout.title.fontSize).toBeCloseTo((180 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS)
		expect(layout.url.fontSize).toBeCloseTo((120 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS)
		expect(layout.name.fontSize).toBeCloseTo((140 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS)
	})

	test('positions short-title sample elements on the grid', () => {
		const title = 'Podcast breaks'
		const g = CANVAS / 12
		const textLines = countCallKentEpisodeArtTitleLines(title)
		const layout = computeCallKentEpisodeArtLayout(CANVAS, title)

		expect(textLines).toBe(1)
		expect(layout.title).toMatchObject({
			left: 0.8 * g,
			top: 0.8 * g,
			width: 6 * g,
			height: 2.6 * g,
		})
		expect(layout.avatar).toMatchObject({
			left: 0.8 * g,
			top: (textLines + 0.6) * g,
			width: 5.5 * g,
			height: 5.5 * g,
		})
		expect(layout.mic).toMatchObject({
			right: g,
			width: 11 * g,
			height: 11 * g,
			top: (CANVAS - 11 * g) / 2,
		})
		expect(layout.url.bottom).toBeCloseTo(0.8 * g)
		expect(layout.name.bottom).toBeCloseTo((-textLines + 5.2) * g)
	})

	test('positions long-title sample elements on the grid', () => {
		const title =
			'How do I convince my team to adopt testing best practices without slowing down delivery?'
		const g = CANVAS / 12
		const textLines = countCallKentEpisodeArtTitleLines(title)
		const layout = computeCallKentEpisodeArtLayout(CANVAS, title)

		expect(textLines).toBe(3)
		expect(layout.avatar.top).toBeCloseTo((textLines + 0.6) * g)
		expect(layout.name.bottom).toBeCloseTo((-textLines + 5.2) * g)
		expect(layout.name.bottom).toBeGreaterThan(layout.url.bottom)
	})
})
