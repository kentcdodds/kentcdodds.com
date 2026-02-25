import { expect, test } from 'vitest'
import {
	applyD1Bookmark,
	getD1Bookmark,
	readD1Bookmark,
	withD1Session,
} from '#app/utils/d1-session.server.ts'

test('readD1Bookmark prefers request header', () => {
	const request = new Request('https://kentcdodds.com', {
		headers: {
			'x-d1-bookmark': 'header-bookmark',
			Cookie: 'd1-bookmark=cookie-bookmark',
		},
	})

	expect(readD1Bookmark(request)).toBe('header-bookmark')
})

test('readD1Bookmark falls back to cookie', () => {
	const request = new Request('https://kentcdodds.com', {
		headers: {
			Cookie: 'theme=dark; d1-bookmark=cookie-bookmark',
		},
	})

	expect(readD1Bookmark(request)).toBe('cookie-bookmark')
})

test('withD1Session uses bookmark when available', () => {
	const withSession = (bookmark?: string) => ({ bookmark })
	const session = withD1Session({ withSession }, 'bookmark-123') as {
		bookmark?: string
	}

	expect(session.bookmark).toBe('bookmark-123')
})

test('getD1Bookmark returns bookmark string from session', () => {
	const bookmark = getD1Bookmark({
		getBookmark: () => 'bookmark-xyz',
	})

	expect(bookmark).toBe('bookmark-xyz')
})

test('applyD1Bookmark appends bookmark header and cookie', () => {
	const response = new Response('ok')
	const withBookmark = applyD1Bookmark(response, 'bookmark-set')

	expect(withBookmark.headers.get('x-d1-bookmark')).toBe('bookmark-set')
	expect(withBookmark.headers.get('Set-Cookie')).toContain(
		'd1-bookmark=bookmark-set',
	)
})
