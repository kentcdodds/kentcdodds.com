import lz from 'lz-string'
import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('mermaid-to-svg mock worker', () => {
	test('returns metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-mermaid.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('mermaid-to-svg')
	})

	test('returns deterministic svg for compressed mermaid input', async () => {
		const compressed = lz.compressToEncodedURIComponent('graph TD; A-->B;')
		const response = await worker.fetch(
			new Request(
				`http://mock-mermaid.local/svg?mermaid=${compressed}&theme=dark`,
			),
			{},
			{},
		)
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toContain('image/svg+xml')
		const svg = await response.text()
		expect(svg).toContain('<svg')
		expect(svg).toContain('Mock mermaid SVG (dark)')
		expect(svg).toContain('graph TD; A--&gt;B;')
	})
})
