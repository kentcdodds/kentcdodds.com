import {
	CALL_KENT_EPISODE_ART_TITLE_LINE_HEIGHT,
} from './call-kent-episode-art-layout.ts'

function collectEmbeddedFontWordStartYs(pathD: string) {
	const wordStartYs: number[] = []
	const first = pathD.match(/^M\s*([0-9.]+)\s+([0-9.]+)/)
	if (first) {
		wordStartYs.push(Number(first[2]))
	}

	for (const match of pathD.matchAll(/ M([0-9.]+)\s+([0-9.]+)/g)) {
		wordStartYs.push(Number(match[2]))
	}

	return wordStartYs
}

function countLineBins(
	wordStartYs: number[],
	{
		fontSize,
		lineHeight = CALL_KENT_EPISODE_ART_TITLE_LINE_HEIGHT,
		originY = 0,
	}: {
		fontSize: number
		lineHeight?: number
		originY?: number
	},
) {
	if (wordStartYs.length === 0) return 0

	const binSize = fontSize * lineHeight * 0.95
	const bins = new Set(
		wordStartYs.map((y) => Math.floor((y - originY) / binSize)),
	)
	return bins.size
}

export function countSatoriSvgEmbeddedFontLines(
	svg: string,
	{
		fontSize,
		lineHeight = CALL_KENT_EPISODE_ART_TITLE_LINE_HEIGHT,
	}: {
		fontSize: number
		lineHeight?: number
	},
) {
	const textYValues = [...svg.matchAll(/<text\b[^>]*\by="([0-9.]+)"/g)].map(
		(match) => Math.round(Number(match[1])),
	)

	if (textYValues.length > 0) {
		return new Set(textYValues).size
	}

	const pathMatch = svg.match(/\bd="([^"]+)"/)
	if (!pathMatch?.[1]) return 0

	return countLineBins(collectEmbeddedFontWordStartYs(pathMatch[1]), {
		fontSize,
		lineHeight,
	})
}

export function countSatoriSvgTitleLinesInRegion(
	svg: string,
	{
		top,
		height,
		fontSize,
		lineHeight = CALL_KENT_EPISODE_ART_TITLE_LINE_HEIGHT,
	}: {
		top: number
		height: number
		fontSize: number
		lineHeight?: number
	},
) {
	const bottom = top + height
	const textYValues = [
		...svg.matchAll(/<text\b[^>]*\by="([0-9.]+)"/g),
	]
		.map((match) => Number(match[1]))
		.filter((y) => y >= top && y <= bottom)

	if (textYValues.length > 0) {
		return new Set(textYValues.map((y) => Math.round(y))).size
	}

	const wordStartYs: number[] = []
	for (const pathMatch of svg.matchAll(/\bd="([^"]+)"/g)) {
		const pathD = pathMatch[1]
		if (!pathD) continue
		for (const y of collectEmbeddedFontWordStartYs(pathD)) {
			if (y >= top - 2 && y <= bottom + 2) {
				wordStartYs.push(y)
			}
		}
	}

	return countLineBins(wordStartYs, {
		fontSize,
		lineHeight,
		originY: top,
	})
}

// Back-compat alias used by lightweight unit test.
export function countSatoriSvgTextLines(svg: string, fontSize = 84) {
	return countSatoriSvgEmbeddedFontLines(svg, { fontSize })
}
