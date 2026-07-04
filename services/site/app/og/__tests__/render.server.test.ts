import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const tinyPngBytes = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	),
	(c) => c.charCodeAt(0),
)

const tinyPng = `data:image/png;base64,${btoa(String.fromCharCode(...tinyPngBytes))}`

vi.mock('satori/yoga.wasm', () => ({ default: {} }))
vi.mock('@resvg/resvg-wasm/index_bg.wasm', () => ({ default: {} }))
vi.mock('satori/standalone', () => ({
	default: vi.fn(async () => '<svg width="1200" height="630"></svg>'),
	init: vi.fn(async () => {}),
}))
vi.mock('@resvg/resvg-wasm', () => ({
	initWasm: vi.fn(async () => {}),
	Resvg: class {
		render() {
			return { asPng: () => tinyPngBytes }
		}
		free() {}
	},
}))
vi.mock('../fonts.server.ts', () => ({
	getOgFonts: vi.fn(async () => [
		{
			name: 'Matter',
			data: new ArrayBuffer(8),
			weight: 400,
			style: 'normal',
		},
	]),
	clearOgFontsCacheForTests: vi.fn(),
}))

describe('renderOgTemplatePng', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(tinyPngBytes, { headers: { 'content-type': 'image/png' } })),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test('renders generic social PNG with expected dimensions', async () => {
		const { renderOgTemplatePng } = await import('../render.server.ts')
		const { png, width, height } = await renderOgTemplatePng('generic-social', {
			words: 'Test social image',
			url: 'kentcdodds.com',
			featuredImage: tinyPng,
		})

		expect(width).toBe(1200)
		expect(height).toBe(630)
		expect(png[0]).toBe(0x89)
		expect(png[1]).toBe(0x50)
		expect(png[2]).toBe(0x4e)
		expect(png[3]).toBe(0x47)
	})
})
