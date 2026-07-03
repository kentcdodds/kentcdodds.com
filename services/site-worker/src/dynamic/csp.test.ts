import { describe, expect, test } from 'vitest'
import {
	applySecurityHeaders,
	buildContentSecurityPolicy,
} from './csp.ts'

describe('security headers', () => {
	test('matches production HSTS and CSP style-src', () => {
		const headers = new Headers()
		applySecurityHeaders({
			headers,
			request: new Request('https://example.com/'),
			cspNonce: 'test-nonce',
		})

		expect(headers.get('Strict-Transport-Security')).toBe(
			'max-age=31536000; includeSubDomains',
		)
		expect(buildContentSecurityPolicy({ nonce: 'test-nonce' })).toContain(
			"style-src 'self' https: 'unsafe-inline'",
		)
	})
})
