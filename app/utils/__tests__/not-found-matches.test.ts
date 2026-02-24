import { describe, expect, test } from 'vitest'
import { normalizeNotFoundUrl } from '../not-found-matches.ts'

describe('normalizeNotFoundUrl', () => {
	test('keeps internal paths as-is', () => {
		expect(normalizeNotFoundUrl('/blog/react')).toBe('/blog/react')
	})

	test('strips origin from absolute http(s) URLs', () => {
		expect(
			normalizeNotFoundUrl('https://kentcdodds.com/blog/react?q=1#hash'),
		).toBe('/blog/react?q=1#hash')
	})

	test('rejects protocol-relative URLs', () => {
		expect(normalizeNotFoundUrl('//evil.com/pwned')).toBe('')
		expect(normalizeNotFoundUrl('https://example.com//evil.com/pwned')).toBe('')
	})

	test('rejects non-http schemes', () => {
		expect(normalizeNotFoundUrl('javascript:alert(1)')).toBe('')
		expect(normalizeNotFoundUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe('')
	})
})

