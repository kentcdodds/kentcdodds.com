import { describe, expect, test } from 'vitest'
import {
	CALL_KENT_EPISODE_ART_DESIGN_SIZE,
	CALL_KENT_EPISODE_ART_GRID_DIVISIONS,
	CALL_KENT_EPISODE_ART_TITLE_MAX_LINES,
	CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT,
	computeCallKentEpisodeArtLayout,
	countCallKentEpisodeArtLayoutTitleLines,
	countCallKentEpisodeArtTitleLines,
	estimateCallKentEpisodeArtWrappedTitleLines,
	fitCallKentEpisodeArtTitleFontSize,
	formatCallKentEpisodeArtTitle,
} from '../call-kent-episode-art-layout.ts'

const CANVAS = 1400
const G = CANVAS / 12
const TITLE_BOX_WIDTH = 6 * G
const TITLE_BOX_HEIGHT = 2.6 * G

describe('computeCallKentEpisodeArtLayout', () => {
	test('uses a 12-column grid scaled to canvas size', () => {
		const layout = computeCallKentEpisodeArtLayout(CANVAS, 'Podcast breaks')

		expect(layout.g).toBeCloseTo(G)
		expect(layout.canvasSize).toBe(CANVAS)
	})

	test('matches Cloudinary font scaling at 1400px for short titles', () => {
		const layout = computeCallKentEpisodeArtLayout(CANVAS, 'Podcast breaks')

		expect(layout.title.fontSize).toBeCloseTo((180 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS)
		expect(layout.url.fontSize).toBeCloseTo((120 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS)
		expect(layout.name.fontSize).toBeCloseTo((140 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS)
	})

	test('shrinks long titles to fit three lines in the title box', () => {
		const title =
			'How do I convince my team to adopt testing best practices without slowing down delivery?'
		const displayTitle = formatCallKentEpisodeArtTitle(title)
		const fit = fitCallKentEpisodeArtTitleFontSize({
			displayTitle,
			boxWidth: TITLE_BOX_WIDTH,
			boxHeight: TITLE_BOX_HEIGHT,
			canvasSize: CANVAS,
		})
		const layout = computeCallKentEpisodeArtLayout(CANVAS, title)

		expect(countCallKentEpisodeArtTitleLines(title)).toBe(3)
		expect(estimateCallKentEpisodeArtWrappedTitleLines(
			displayTitle,
			TITLE_BOX_WIDTH,
			(180 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS,
		)).toBeGreaterThan(3)
		expect(fit.estimatedLines).toBeLessThanOrEqual(3)
		expect(fit.fontSize).toBeLessThan((180 / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * CANVAS)
		expect(layout.title.fontSize).toBe(fit.fontSize)
		expect(layout.title.estimatedLines).toBeLessThanOrEqual(3)
		expect(layout.title.fontSize).toBeLessThanOrEqual(64.5)
	})

	test('positions short-title sample elements on the grid', () => {
		const title = 'Podcast breaks'
		const layoutTitleLines = countCallKentEpisodeArtLayoutTitleLines(title, 1)
		const layout = computeCallKentEpisodeArtLayout(CANVAS, title)
		const micHeight = 11 * G
		const micWidth = micHeight * CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT

		expect(layoutTitleLines).toBe(1)
		expect(layout.title).toMatchObject({
			left: 0.8 * G,
			top: 0.8 * G,
			width: TITLE_BOX_WIDTH,
			minHeight: TITLE_BOX_HEIGHT,
		})
		expect(layout.avatar).toMatchObject({
			left: 0.8 * G,
			top: (layoutTitleLines + 0.6) * G,
			width: 5.5 * G,
			height: 5.5 * G,
		})
		expect(layout.mic).toMatchObject({
			right: G,
			width: micWidth,
			height: micHeight,
			top: (CANVAS - micHeight) / 2,
		})
		expect(layout.url.bottom).toBeCloseTo(0.8 * G)
		expect(layout.name.bottom).toBeCloseTo((-layout.textLines + 5.2) * G)
	})

	test('positions long-title sample elements on the grid without avatar overlap', () => {
		const title =
			'How do I convince my team to adopt testing best practices without slowing down delivery?'
		const layout = computeCallKentEpisodeArtLayout(CANVAS, title)
		const titleBottom = layout.title.top + layout.title.minHeight

		expect(layout.layoutTitleLines).toBe(3)
		expect(layout.avatar.top).toBeCloseTo(3.6 * G)
		expect(layout.avatar.top).toBeGreaterThanOrEqual(titleBottom)
		expect(layout.name.bottom).toBeCloseTo((-layout.textLines + 5.2) * G)
		expect(layout.name.bottom).toBeGreaterThan(layout.url.bottom)
	})
})
