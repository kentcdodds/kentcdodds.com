import { describe, expect, test } from 'vitest'
import {
	CALL_KENT_EPISODE_ART_DESIGN_SIZE,
	CALL_KENT_EPISODE_ART_GRID_DIVISIONS,
	CALL_KENT_EPISODE_ART_TITLE_MAX_LINES,
	CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT,
	computeCallKentEpisodeArtLayout,
	countCallKentEpisodeArtLayoutTitleLines,
	countCallKentEpisodeArtTitleLines,
	formatCallKentEpisodeArtTitle,
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

	test('clamps long titles to 50 characters with ellipsis', () => {
		const title =
			'How do I convince my team to adopt testing best practices without slowing down delivery?'
		expect(formatCallKentEpisodeArtTitle(title)).toBe(
			'How do I convince my team to adopt testing best...',
		)
		expect(countCallKentEpisodeArtTitleLines(title)).toBe(3)
		expect(countCallKentEpisodeArtLayoutTitleLines(title)).toBe(
			CALL_KENT_EPISODE_ART_TITLE_MAX_LINES,
		)
	})

	test('positions short-title sample elements on the grid', () => {
		const title = 'Podcast breaks'
		const g = CANVAS / 12
		const layoutTitleLines = countCallKentEpisodeArtLayoutTitleLines(title)
		const layout = computeCallKentEpisodeArtLayout(CANVAS, title)
		const micHeight = 11 * g
		const micWidth = micHeight * CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT

		expect(layoutTitleLines).toBe(1)
		expect(layout.title).toMatchObject({
			left: 0.8 * g,
			top: 0.8 * g,
			width: 6 * g,
			minHeight: 2.6 * g,
		})
		expect(layout.avatar).toMatchObject({
			left: 0.8 * g,
			top: (layoutTitleLines + 0.6) * g,
			width: 5.5 * g,
			height: 5.5 * g,
		})
		expect(layout.mic).toMatchObject({
			right: g,
			width: micWidth,
			height: micHeight,
			top: (CANVAS - micHeight) / 2,
		})
		expect(layout.mic.width / CANVAS).toBeGreaterThan(0.44)
		expect(layout.mic.width / CANVAS).toBeLessThan(0.52)
		expect(layout.url.bottom).toBeCloseTo(0.8 * g)
		expect(layout.name.bottom).toBeCloseTo((-layout.textLines + 5.2) * g)
	})

	test('positions long-title sample elements on the grid without avatar overlap', () => {
		const title =
			'How do I convince my team to adopt testing best practices without slowing down delivery?'
		const g = CANVAS / 12
		const layout = computeCallKentEpisodeArtLayout(CANVAS, title)
		const titleBottom = layout.title.top + layout.title.minHeight

		expect(layout.layoutTitleLines).toBe(3)
		expect(layout.avatar.top).toBeCloseTo(3.6 * g)
		expect(layout.avatar.top).toBeGreaterThanOrEqual(titleBottom)
		expect(layout.name.bottom).toBeCloseTo((-layout.textLines + 5.2) * g)
		expect(layout.name.bottom).toBeGreaterThan(layout.url.bottom)
	})
})
