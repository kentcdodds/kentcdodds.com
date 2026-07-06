import { stripEmoji } from './assets.server.ts'

export const CALL_KENT_EPISODE_ART_DESIGN_SIZE = 3000
export const CALL_KENT_EPISODE_ART_GRID_DIVISIONS = 12
export const CALL_KENT_EPISODE_ART_TITLE_MAX_CHARS = 50
export const CALL_KENT_EPISODE_ART_TITLE_MAX_LINES = 3
export const CALL_KENT_EPISODE_ART_TITLE_LINE_HEIGHT = 1.1
export const CALL_KENT_EPISODE_ART_TITLE_CHAR_WIDTH_FACTOR = 0.62

// Original artwork c_fit font steps for Matter-Medium title (design px at 3000 canvas).
export const CALL_KENT_EPISODE_ART_TITLE_FONT_DESIGN_STEPS = [
	180, 154, 137, 120, 108, 96,
] as const

// Measured from kentcdodds.com/illustrations/mic.png IHDR (956×1898).
export const CALL_KENT_MIC_ILLUSTRATION_NATURAL_WIDTH = 956
export const CALL_KENT_MIC_ILLUSTRATION_NATURAL_HEIGHT = 1898
export const CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT =
	CALL_KENT_MIC_ILLUSTRATION_NATURAL_WIDTH /
	CALL_KENT_MIC_ILLUSTRATION_NATURAL_HEIGHT

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
	layoutTitleLines: number
	title: CallKentEpisodeArtElementBox & {
		fontSize: number
		minHeight: number
		estimatedLines: number
	}
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

export function estimateCallKentEpisodeArtTitleCharsPerLine(
	boxWidth: number,
	fontSize: number,
) {
	return Math.max(
		1,
		Math.floor(
			boxWidth /
				(fontSize * CALL_KENT_EPISODE_ART_TITLE_CHAR_WIDTH_FACTOR),
		),
	)
}

export function estimateCallKentEpisodeArtWrappedTitleLines(
	text: string,
	boxWidth: number,
	fontSize: number,
) {
	const charsPerLine = estimateCallKentEpisodeArtTitleCharsPerLine(
		boxWidth,
		fontSize,
	)
	const words = text.split(/\s+/).filter(Boolean)
	if (words.length === 0) return 0

	let lines = 1
	let currentLineChars = 0

	for (const word of words) {
		if (currentLineChars === 0) {
			currentLineChars = word.length
			continue
		}

		if (currentLineChars + 1 + word.length <= charsPerLine) {
			currentLineChars += 1 + word.length
		} else {
			lines++
			currentLineChars = word.length
		}
	}

	return lines
}

export function titleFitsCallKentEpisodeArtBox({
	estimatedLines,
	fontSize,
	boxHeight,
}: {
	estimatedLines: number
	fontSize: number
	boxHeight: number
}) {
	return (
		estimatedLines <= CALL_KENT_EPISODE_ART_TITLE_MAX_LINES &&
		fontSize * CALL_KENT_EPISODE_ART_TITLE_LINE_HEIGHT * estimatedLines <=
			boxHeight
	)
}

export function fitCallKentEpisodeArtTitleFontSize({
	displayTitle,
	boxWidth,
	boxHeight,
	canvasSize,
}: {
	displayTitle: string
	boxWidth: number
	boxHeight: number
	canvasSize: number
}) {
	for (const designFontSize of CALL_KENT_EPISODE_ART_TITLE_FONT_DESIGN_STEPS) {
		const fontSize = scaleFontSize(designFontSize, canvasSize)
		const estimatedLines = estimateCallKentEpisodeArtWrappedTitleLines(
			displayTitle,
			boxWidth,
			fontSize,
		)
		if (
			titleFitsCallKentEpisodeArtBox({
				estimatedLines,
				fontSize,
				boxHeight,
			})
		) {
			return {
				fontSize,
				estimatedLines,
				designFontSize,
			}
		}
	}

	const designFontSize =
		CALL_KENT_EPISODE_ART_TITLE_FONT_DESIGN_STEPS.at(-1) ?? 120
	const fontSize = scaleFontSize(designFontSize, canvasSize)
	return {
		fontSize,
		estimatedLines: CALL_KENT_EPISODE_ART_TITLE_MAX_LINES,
		designFontSize,
	}
}

export function countCallKentEpisodeArtLayoutTitleLines(
	title: string,
	estimatedLines: number,
) {
	const charLines = countCallKentEpisodeArtTitleLines(title)
	const stripped = stripEmoji(title)
	const truncated = stripped.length > CALL_KENT_EPISODE_ART_TITLE_MAX_CHARS

	if (
		truncated ||
		charLines >= CALL_KENT_EPISODE_ART_TITLE_MAX_LINES ||
		estimatedLines >= CALL_KENT_EPISODE_ART_TITLE_MAX_LINES
	) {
		return CALL_KENT_EPISODE_ART_TITLE_MAX_LINES
	}

	return charLines
}

export function computeCallKentEpisodeArtLayout(
	canvasSize: number,
	title: string,
): CallKentEpisodeArtLayout {
	const g = canvasSize / CALL_KENT_EPISODE_ART_GRID_DIVISIONS
	const textLines = countCallKentEpisodeArtTitleLines(title)
	const displayTitle = formatCallKentEpisodeArtTitle(title)
	const titleBoxWidth = 6 * g
	const titleMinHeight = 2.6 * g
	const titleFit = fitCallKentEpisodeArtTitleFontSize({
		displayTitle,
		boxWidth: titleBoxWidth,
		boxHeight: titleMinHeight,
		canvasSize,
	})
	const layoutTitleLines = countCallKentEpisodeArtLayoutTitleLines(
		title,
		titleFit.estimatedLines,
	)
	const micHeight = 11 * g
	const micWidth = micHeight * CALL_KENT_MIC_ILLUSTRATION_WIDTH_TO_HEIGHT

	return {
		canvasSize,
		g,
		textLines,
		layoutTitleLines,
		title: {
			left: 0.8 * g,
			top: 0.8 * g,
			width: titleBoxWidth,
			height: titleMinHeight,
			minHeight: titleMinHeight,
			fontSize: titleFit.fontSize,
			estimatedLines: titleFit.estimatedLines,
		},
		avatar: {
			left: 0.8 * g,
			top: (layoutTitleLines + 0.6) * g,
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
		layoutTitleLines: layout.layoutTitleLines,
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
