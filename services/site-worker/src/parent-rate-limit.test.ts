import { beforeEach, describe, expect, test } from 'vitest'
import {
	checkParentRateLimit,
	clearParentRateLimitWindowsForTests,
	isParentSecretAuthorized,
} from './parent-rate-limit.ts'

function makeRequest(ip: string) {
	return new Request('https://example.com/resources/og-image', {
		headers: { 'CF-Connecting-IP': ip },
	})
}

describe('checkParentRateLimit', () => {
	beforeEach(() => {
		clearParentRateLimitWindowsForTests()
	})

	test('allows up to the limit then rejects, per IP and bucket', () => {
		for (let i = 0; i < 3; i++) {
			expect(
				checkParentRateLimit(makeRequest('1.1.1.1'), {
					bucket: 'og-image',
					limit: 3,
				}).allowed,
			).toBe(true)
		}
		const blocked = checkParentRateLimit(makeRequest('1.1.1.1'), {
			bucket: 'og-image',
			limit: 3,
		})
		expect(blocked.allowed).toBe(false)
		expect(blocked.retryAfterSec).toBeGreaterThan(0)

		// Different IP and different bucket are unaffected.
		expect(
			checkParentRateLimit(makeRequest('2.2.2.2'), {
				bucket: 'og-image',
				limit: 3,
			}).allowed,
		).toBe(true)
		expect(
			checkParentRateLimit(makeRequest('1.1.1.1'), {
				bucket: 'media',
				limit: 3,
			}).allowed,
		).toBe(true)
	})
})

describe('isParentSecretAuthorized', () => {
	test('matches only the exact secret and tolerates missing values', () => {
		expect(isParentSecretAuthorized('secret', 'secret')).toBe(true)
		expect(isParentSecretAuthorized('wrong', 'secret')).toBe(false)
		expect(isParentSecretAuthorized('secre', 'secret')).toBe(false)
		expect(isParentSecretAuthorized(null, 'secret')).toBe(false)
		expect(isParentSecretAuthorized('secret', undefined)).toBe(false)
		expect(isParentSecretAuthorized('', '')).toBe(false)
	})
})
