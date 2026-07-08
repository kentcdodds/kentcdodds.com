import { expect, test } from 'vitest'
import {
	deserializeSqlRow,
	normalizePasskeyCounter,
	normalizePublicKey,
	serializeSqlParam,
} from '../row-serialization.server.ts'

test('serializeSqlParam converts dates and byte views to RPC-safe values', () => {
	const date = new Date('2026-01-01T00:00:00.000Z')
	expect(serializeSqlParam(date)).toBe('2026-01-01T00:00:00.000Z')
	expect(serializeSqlParam(42n)).toBe(42)

	const bytes = new Uint8Array([1, 2, 3])
	const serialized = serializeSqlParam(bytes)
	if (typeof Buffer !== 'undefined') {
		expect(Buffer.isBuffer(serialized)).toBe(true)
		expect(new Uint8Array(serialized as Buffer)).toEqual(bytes)
	} else {
		expect(serialized).toBeInstanceOf(ArrayBuffer)
		expect(new Uint8Array(serialized as ArrayBuffer)).toEqual(bytes)
	}
})

test('deserializeSqlRow revives ISO date strings', () => {
	const row = deserializeSqlRow({
		createdAt: '2026-01-01T00:00:00.000Z',
		title: 'hello',
	})
	expect(row.createdAt).toBeInstanceOf(Date)
	expect(row.title).toBe('hello')
})

test('normalizePasskeyCounter and normalizePublicKey coerce boundary types', () => {
	expect(normalizePasskeyCounter(12n)).toBe(12)
	const key = new Uint8Array([9, 8, 7])
	expect(normalizePublicKey(key.buffer)).toEqual(key)
})
