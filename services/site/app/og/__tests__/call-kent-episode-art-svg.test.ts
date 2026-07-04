import { describe, expect, test } from 'vitest'
import { countSatoriSvgTextLines } from '../call-kent-episode-art-svg.ts'

describe('countSatoriSvgTextLines', () => {
	test('counts distinct text baselines from <text> elements', () => {
		const svg = `
			<svg>
				<text y="10">Line 1</text>
				<text y="30">Line 2</text>
				<text y="30">Line 2 duplicate</text>
				<text y="50">Line 3</text>
			</svg>
		`
		expect(countSatoriSvgTextLines(svg)).toBe(3)
	})
})
