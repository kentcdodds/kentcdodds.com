export const SECURITY_HEADERS = {
	'referrer-policy': 'no-referrer',
	'x-content-type-options': 'nosniff',
	'x-download-options': 'noopen',
	'x-xss-protection': '0',
	'cross-origin-opener-policy': 'same-origin',
	'cross-origin-resource-policy': 'same-origin',
	'origin-agent-cluster': '?1',
	'x-dns-prefetch-control': 'off',
	'x-permitted-cross-domain-policies': 'none',
} as const

export function applySecurityHeaders(headers: Headers) {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(name, value)
	}
}
