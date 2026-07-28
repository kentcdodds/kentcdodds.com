import { expect, test } from 'vitest'
import {
	getSignupVerificationRedirectTo,
	isUuid,
} from '#app/utils/verification.server.ts'

test('isUuid accepts standard UUID strings only', () => {
	expect(isUuid('12345678-1234-1234-1234-123456789abc')).toBe(true)
	expect(isUuid('12345678-1234-1234-1234-123456789abc\uFFFD')).toBe(false)
	expect(isUuid('not-a-uuid')).toBe(false)
	expect(isUuid('')).toBe(false)
})

test('signup verify failure redirect keeps valid verification ids', () => {
	const id = '12345678-1234-1234-1234-123456789abc'
	expect(getSignupVerificationRedirectTo(id)).toBe(`/signup?verification=${id}`)
})

test('signup verify failure redirect drops non-ByteString verification ids', () => {
	// Sentry KCD-ZN: raw interpolation into Location threw
	// "Cannot convert argument to a ByteString ... 65533".
	const poisoned = `12345678-1234-1234-1234-123456789abc\uFFFD`
	const unsafeLocation = `/signup?verification=${poisoned}`
	expect(() => new Headers().set('Location', unsafeLocation)).toThrow(
		/ByteString|65533/,
	)

	const safeLocation = getSignupVerificationRedirectTo(poisoned)
	expect(safeLocation).toBe('/signup')
	expect(() => new Headers().set('Location', safeLocation)).not.toThrow()
})
