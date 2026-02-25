import { expect, test } from 'vitest'
import { isLowSignalYoutubeCaptionCueLine } from '../youtube-transcript-cue-filter.ts'

test('isLowSignalYoutubeCaptionCueLine matches bracket-only cues', () => {
	expect(isLowSignalYoutubeCaptionCueLine('[Music]')).toBe(true)
	expect(isLowSignalYoutubeCaptionCueLine('[Applause] [Music]')).toBe(true)
	expect(isLowSignalYoutubeCaptionCueLine('[Laughter], [Applause]')).toBe(true)
})

test('isLowSignalYoutubeCaptionCueLine matches bare cue words', () => {
	expect(isLowSignalYoutubeCaptionCueLine('music')).toBe(true)
	expect(isLowSignalYoutubeCaptionCueLine('Applause')).toBe(true)
	expect(isLowSignalYoutubeCaptionCueLine('inaudible')).toBe(true)
})

test('isLowSignalYoutubeCaptionCueLine keeps meaningful transcript lines', () => {
	expect(
		isLowSignalYoutubeCaptionCueLine(
			'Remix makes progressive enhancement easier for this workflow.',
		),
	).toBe(false)
	expect(
		isLowSignalYoutubeCaptionCueLine(
			'[Music] and then we talk about build tools and testing.',
		),
	).toBe(false)
})
