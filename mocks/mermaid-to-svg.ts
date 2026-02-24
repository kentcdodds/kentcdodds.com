import { http, HttpResponse, passthrough, type HttpHandler } from 'msw'
import lz from 'lz-string'
import { isConnectedToTheInternet } from './utils.ts'

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}

export const mermaidToSvgHandlers: Array<HttpHandler> = [
	http.get('https://mermaid-to-svg.kentcdodds.workers.dev/svg', async ({ request }) => {
		// In dev, prefer the real worker when internet is available so diagrams are
		// accurate. In tests/offline environments, return a deterministic SVG.
		if (process.env.NODE_ENV !== 'test' && (await isConnectedToTheInternet())) {
			return passthrough()
		}

		const url = new URL(request.url)
		const compressed = url.searchParams.get('mermaid')
		if (!compressed) {
			return new HttpResponse('Missing mermaid parameter', { status: 400 })
		}

		const theme = url.searchParams.get('theme') === 'dark' ? 'dark' : 'default'
		const mermaidString = lz.decompressFromEncodedURIComponent(compressed) ?? ''
		const snippet = escapeXml(mermaidString.replace(/\s+/g, ' ').slice(0, 160))

		const fg = theme === 'dark' ? '#e5e7eb' : '#111827'
		const bg = theme === 'dark' ? '#111827' : '#ffffff'
		const border = theme === 'dark' ? '#334155' : '#cbd5e1'

		const svg = [
			`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="220" viewBox="0 0 900 220">`,
			`<rect x="0.5" y="0.5" width="899" height="219" rx="12" fill="${bg}" stroke="${border}" />`,
			`<text x="24" y="48" fill="${fg}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="18">Mock mermaid SVG (${theme})</text>`,
			`<text x="24" y="86" fill="${fg}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="13">`,
			`${snippet || '(empty)'}`,
			`</text>`,
			`</svg>`,
		].join('')

		return new HttpResponse(svg, {
			status: 200,
			headers: { 'Content-Type': 'image/svg+xml' },
		})
	}),
]

