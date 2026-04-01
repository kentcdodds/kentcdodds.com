// @vitest-environment node
import { expect, test } from 'vitest'

import {
	isSeason7ChatsPath,
	SEASON_7_PROMOTIFICATION_NAME,
} from '../season-7-promotification.ts'
import {
	PROMO_HIDDEN_COOKIE_VALUE,
	createPromoHiddenSetCookieHeader,
} from '#app/routes/resources/promotification.tsx'

test('matches season 7 chats landing and child routes', () => {
	expect(isSeason7ChatsPath('/chats/07')).toBe(true)
	expect(isSeason7ChatsPath('/chats/07/01/example-episode')).toBe(true)
	expect(isSeason7ChatsPath('/chats/7')).toBe(true)
	expect(isSeason7ChatsPath('/chats/7/1/example-episode')).toBe(true)
})

test('does not match other chats routes', () => {
	expect(isSeason7ChatsPath('/chats')).toBe(false)
	expect(isSeason7ChatsPath('/chats/06')).toBe(false)
	expect(isSeason7ChatsPath('/chats/08/01/example-episode')).toBe(false)
	expect(isSeason7ChatsPath('/calls/07')).toBe(false)
})

test('creates the hidden season 7 promo cookie header', () => {
	const cookieHeader = createPromoHiddenSetCookieHeader({
		promoName: SEASON_7_PROMOTIFICATION_NAME,
	})

	expect(cookieHeader).toContain(
		`${SEASON_7_PROMOTIFICATION_NAME}=${PROMO_HIDDEN_COOKIE_VALUE}`,
	)
	expect(cookieHeader).toContain('HttpOnly')
	expect(cookieHeader).toContain('Path=/')
})
