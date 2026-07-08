import { describe, expect, test } from 'vitest'
import { decodePngFromKv, encodePngForKv } from '../kv-cache.server.ts'

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('og kv cache encoding', () => {
	test('round-trips PNG bytes via base64', () => {
		const encoded = encodePngForKv(PNG_HEADER)
		const decoded = decodePngFromKv(encoded)
		expect(decoded).toEqual(PNG_HEADER)
	})

	test('decodes legacy miniflare latin1 strings', () => {
		const latin1 = String.fromCharCode(...PNG_HEADER)
		const decoded = decodePngFromKv(latin1)
		expect(decoded).toEqual(PNG_HEADER)
	})

	test('decodes ArrayBuffer values', () => {
		const buffer = PNG_HEADER.buffer.slice(
			PNG_HEADER.byteOffset,
			PNG_HEADER.byteOffset + PNG_HEADER.byteLength,
		)
		const decoded = decodePngFromKv(buffer)
		expect(decoded).toEqual(PNG_HEADER)
	})
})
