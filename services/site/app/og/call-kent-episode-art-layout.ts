import { stripEmoji } from './assets.server.ts'

export const CALL_KENT_EPISODE_ART_DESIGN_SIZE = 3000
export const CALL_KENT_EPISODE_ART_GRID_DIVISIONS = 12
export const CALL_KENT_EPISODE_ART_TITLE_MAX_CHARS = 50
export const CALL_KENT_EPISODE_ART_TITLE_MAX_LINES = 3

// Measured from kentcdodds.com/illustrations/mic.png (956×1898).
export const CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT = 956 / 1898

export type CallKentEpisodeArtElementBox = {
	left: number
	top: number
	width: number
	height: number
}

export type CallKentEpisodeArtLayout = {
	canvasSize: number
	g: number
	textLines: number
	title: CallKentEpisodeArtElementBox & { fontSize: number }
	avatar: CallKentEpisodeArtElementBox
	mic: CallKentEpisodeArtElementBox & { right: number }
	url: CallKentEpisodeArtElementBox & { fontSize: number; bottom: number }
	name: CallKentEpisodeArtElementBox & { fontSize: number; bottom: number }
}

function scaleFontSize(designFontSize: number, canvasSize: number) {
	return (designFontSize / CALL_KENT_EPISODE_ART_DESIGN_SIZE) * canvasSize
}

export function countCallKentEpisodeArtTitleLines(title: string) {
	return Math.ceil(
		Math.min(stripEmoji(title).length, CALL_KENT_EPISODE_ART_TITLE_MAX_CHARS) /
			18,
	)
}

export function formatCallKentEpisodeArtTitle(title: string) {
	const stripped = stripEmoji(title)
	if (stripped.length <= CALL_KENT_EPISODE_ART_TITLE_MAX_CHARS) {
		return stripped
	}
	return `${stripped.slice(0, CALL_KENT_EPISODE_ART_TITLE_MAX_CHARS - 3).trimEnd()}...`
}

export function computeCallKentEpisodeArtLayout(
	canvasSize: number,
	title: string,
): CallKentEpisodeArtLayout {
	const g = canvasSize / CALL_KENT_EPISODE_ART_GRID_DIVISIONS
	const textLines = countCallKentEpisodeArtTitleLines(title)
	const micHeight = 11 * g
	const micWidth = micHeight * CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT

	return {
		canvasSize,
		g,
		textLines,
		title: {
			left: 0.8 * g,
			top: 0.8 * g,
			width: 6 * g,
			height: 2.6 * g,
			fontSize: scaleFontSize(180, canvasSize),
		},
		avatar: {
			left: 0.8 * g,
			top: (textLines + 0.6) * g,
			width: 5.5 * g,
			height: 5.5 * g,
		},
		mic: {
			left: canvasSize - g - micWidth,
			top: (canvasSize - micHeight) / 2,
			right: g,
			width: micWidth,
			height: micHeight,
		},
		url: {
			left: 0.8 * g,
			top: canvasSize - 0.8 * g - 4 * g,
			bottom: 0.8 * g,
			width: 8 * g,
			height: 4 * g,
			fontSize: scaleFontSize(120, canvasSize),
		},
		name: {
			left: 0.8 * g,
			top: canvasSize - (-textLines + 5.2) * g - 4 * g,
			bottom: (-textLines + 5.2) * g,
			width: 8 * g,
			height: 4 * g,
			fontSize: scaleFontSize(140, canvasSize),
		},
	}
}

export function layoutBoxesForDump(layout: CallKentEpisodeArtLayout) {
	return {
		canvasSize: layout.canvasSize,
		g: layout.g,
		textLines: layout.textLines,
		title: layout.title,
		avatar: layout.avatar,
		mic: layout.mic,
		url: {
			left: layout.url.left,
			bottom: layout.url.bottom,
			width: layout.url.width,
			height: layout.url.height,
			fontSize: layout.url.fontSize,
		},
		name: {
			left: layout.name.left,
			bottom: layout.name.bottom,
			width: layout.name.width,
			height: layout.name.height,
			fontSize: layout.name.fontSize,
		},
	}
}
