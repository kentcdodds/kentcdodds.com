import { describe, expect, test } from 'vitest'
import {
	chunkText,
	chunkTextRaw,
	mapWithConcurrency,
	normalizeText,
	sha256,
} from '../chunk-utils.ts'

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

	test('mapWithConcurrency rejects when mapper throws undefined', async () => {
		await expect(
			mapWithConcurrency([1, 2, 3], 1, async (item) => {
				if (item === 2) throw undefined
				return item
			}),
		).rejects.toBeUndefined()
	})

	test('chunkTextRaw does not split surrogate pairs', () => {
		const emoji = '😀' // surrogate pair in UTF-16
		const input = `${emoji.repeat(2000)}\n\n${emoji.repeat(2000)}`
		const chunks = chunkTextRaw(input, { targetChars: 2500, overlapChars: 250 })
		expect(chunks.length).toBeGreaterThan(1)

		for (const c of chunks) {
			const first = c.charCodeAt(0)
			const last = c.charCodeAt(Math.max(0, c.length - 1))
			// Not a low surrogate at the start; not a high surrogate at the end.
			expect(first >= 0xdc00 && first <= 0xdfff).toBe(false)
			expect(last >= 0xd800 && last <= 0xdbff).toBe(false)
		}
	})
})
