import { describe, expect, test } from 'vitest'
import {
	applySecurityHeaders,
	SECURITY_HEADERS,
} from '../security-headers.server.ts'

describe('applySecurityHeaders', () => {
	test('sets all helmet-parity security headers', () => {
		const headers = new Headers()
		applySecurityHeaders(headers)

		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			expect(headers.get(name)).toBe(value)
		}
	})

	test('overwrites existing values for the same headers', () => {
		const headers = new Headers({
			'referrer-policy': 'unsafe-url',
			'x-content-type-options': 'nosniff',
		})
		applySecurityHeaders(headers)

		expect(headers.get('referrer-policy')).toBe('no-referrer')
		expect(headers.get('x-content-type-options')).toBe('nosniff')
	})
})
