import { describe, expect, test } from 'vitest'
import { isDocIdIgnored, matchesIgnorePattern } from '../ignore-list.ts'

describe('semantic search ignore list', () => {
	test('matches exact doc IDs', () => {
		expect(
			matchesIgnorePattern('youtube:dQw4w9WgXcQ', 'youtube:dQw4w9WgXcQ'),
		).toBe(true)
		expect(matchesIgnorePattern('youtube:dQw4w9WgXcQ', 'youtube:other')).toBe(
			false,
		)
		expect(matchesIgnorePattern('blog:hello', 'blog:hello')).toBe(true)
		expect(matchesIgnorePattern('blog:hello', 'blog:hello ')).toBe(true)
	})

	test('matches prefix patterns ending with *', () => {
		expect(matchesIgnorePattern('youtube:dQw4w9WgXcQ', 'youtube:*')).toBe(true)
		expect(matchesIgnorePattern('blog:react-hooks', 'blog:react*')).toBe(true)
		expect(matchesIgnorePattern('page:uses', 'blog:*')).toBe(false)
		// A bare '*' is an empty prefix and therefore matches every doc ID.
		expect(matchesIgnorePattern('youtube:anything', '*')).toBe(true)
		expect(matchesIgnorePattern('blog:some-post', '*')).toBe(true)
	})

	test('isDocIdIgnored checks the ignore list patterns', () => {
		const ignoreList = {
			version: 1 as const,
			updatedAt: '2026-02-20T00:00:00.000Z',
			patterns: ['youtube:*', 'blog:secret-post'],
		}

		expect(isDocIdIgnored({ docId: 'youtube:anything', ignoreList })).toBe(true)
		expect(isDocIdIgnored({ docId: 'blog:secret-post', ignoreList })).toBe(true)
		expect(isDocIdIgnored({ docId: 'blog:public-post', ignoreList })).toBe(
			false,
		)
	})
})
