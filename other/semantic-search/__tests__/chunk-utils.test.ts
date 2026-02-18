import { describe, expect, test } from 'vitest'
import { chunkText, normalizeText, sha256 } from '../chunk-utils.ts'

describe('semantic-search chunk utils', () => {
	test('normalizeText is deterministic', () => {
		const a = normalizeText('hello\tworld\r\n\r\n  there   ')
		const b = normalizeText('hello world\n\nthere')
		expect(a).toBe(b)
	})

	test('chunkText returns stable chunk boundaries', () => {
		const input = Array.from({ length: 200 }, (_, i) => `para ${i}\nline two`)
			.join('\n\n')
			.repeat(2)
		const chunks1 = chunkText(input)
		const chunks2 = chunkText(input)
		expect(chunks1).toEqual(chunks2)
		expect(chunks1.length).toBeGreaterThan(1)
	})

	test('sha256 is stable', () => {
		expect(sha256('abc')).toBe(sha256('abc'))
		expect(sha256('abc')).not.toBe(sha256('abcd'))
	})
})

