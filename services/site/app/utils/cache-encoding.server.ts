import { Buffer } from 'node:buffer'
import { totalTtl, type CacheEntry } from '@epic-web/cachified'

const MIN_KV_TTL_SECONDS = 60

type BufferLike = { __isBuffer: true; data: string }
type SerializedNodeBuffer = { type: 'Buffer'; data: Array<number> }

function isBuffer(value: unknown) {
	return Buffer.isBuffer(value) || value instanceof Uint8Array
}

function isSerializedNodeBuffer(value: unknown): value is SerializedNodeBuffer {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { type?: unknown }).type === 'Buffer' &&
		Array.isArray((value as { data?: unknown }).data)
	)
}

export function bufferReplacer(_key: string, value: unknown) {
	if (isBuffer(value)) {
		return {
			__isBuffer: true,
			data: Buffer.from(value).toString('base64'),
		} satisfies BufferLike
	}

	if (isSerializedNodeBuffer(value)) {
		return {
			__isBuffer: true,
			data: Buffer.from(value.data).toString('base64'),
		} satisfies BufferLike
	}

	return value
}

export function bufferReviver(_key: string, value: unknown) {
	if (
		value &&
		typeof value === 'object' &&
		'__isBuffer' in value &&
		(value as BufferLike).data
	) {
		return Buffer.from((value as BufferLike).data, 'base64')
	}

	if (isSerializedNodeBuffer(value)) {
		return Buffer.from(value.data)
	}

	return value
}

export function encodeCacheEntry(entry: CacheEntry<unknown>) {
	return {
		value: JSON.stringify(entry.value, bufferReplacer),
		metadata: JSON.stringify(entry.metadata),
	}
}

export function decodeCacheEntry(
	stored: { value: string; metadata: string } | null,
): CacheEntry<unknown> | null {
	if (!stored) return null
	return {
		value: JSON.parse(stored.value, bufferReviver),
		metadata: JSON.parse(stored.metadata),
	}
}

export function getKvExpirationTtl(entry: CacheEntry<unknown>) {
	const ttlMs = totalTtl(entry.metadata)
	if (!Number.isFinite(ttlMs) || ttlMs <= 0) return undefined
	return Math.max(MIN_KV_TTL_SECONDS, Math.ceil(ttlMs / 1000))
}
