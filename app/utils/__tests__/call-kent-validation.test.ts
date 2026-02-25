import { describe, expect, test } from 'vitest'
import {
	getErrorForAudio,
	getErrorForNotes,
	getErrorForTitle,
} from '../call-kent.ts'

describe('call-kent field validation', () => {
	test('accepts binary audio files and rejects empty files', () => {
		expect(getErrorForAudio(new File(['audio-bytes'], 'call.webm'))).toBeNull()
		expect(getErrorForAudio(new File([], 'empty.webm'))).toBe(
			'Audio file is required',
		)
	})

	test('keeps string-based audio validation for compatibility', () => {
		expect(getErrorForAudio('data:audio/webm;base64,AAAA')).toBeNull()
		expect(getErrorForAudio(null)).toBe('Audio file is required')
	})

	test('validates title and notes constraints', () => {
		expect(getErrorForTitle('abcd')).toContain('at least')
		expect(getErrorForTitle('abcde')).toBeNull()
		expect(getErrorForNotes('')).toBeNull()
		expect(getErrorForNotes('x'.repeat(5001))).toContain('no longer than 5000')
	})
})
