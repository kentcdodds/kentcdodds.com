const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

/**
 * Normalize values bound into SQL statements before crossing RPC boundaries.
 * Dates become ISO strings; bigint becomes number; byte views become ArrayBuffer.
 */
export function serializeSqlParam(value: unknown): unknown {
	if (value instanceof Date) {
		return value.toISOString()
	}
	if (typeof value === 'bigint') {
		return Number(value)
	}
	if (value instanceof ArrayBuffer) {
		return value
	}
	if (ArrayBuffer.isView(value)) {
		const view = value as ArrayBufferView
		const bytes = view.buffer.slice(
			view.byteOffset,
			view.byteOffset + view.byteLength,
		)
		if (typeof Buffer !== 'undefined') {
			return Buffer.from(bytes)
		}
		return bytes
	}
	return value
}

export function serializeSqlParams(params: readonly unknown[] = []) {
	return params.map(serializeSqlParam)
}

export function deserializeSqlRow(row: Record<string, unknown>) {
	const output: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(row)) {
		output[key] = deserializeSqlValue(value)
	}
	return output
}

export function deserializeSqlRows(rows: Array<Record<string, unknown>> = []) {
	return rows.map(deserializeSqlRow)
}

function deserializeSqlValue(value: unknown): unknown {
	if (value === null || value === undefined) {
		return value
	}
	if (value instanceof ArrayBuffer) {
		return value
	}
	if (ArrayBuffer.isView(value)) {
		return value
	}
	if (typeof value === 'string' && ISO_DATE_PREFIX.test(value)) {
		return new Date(value)
	}
	if (typeof value === 'bigint') {
		return Number(value)
	}
	return value
}

/**
 * Passkey.counter is stored as BIGINT in SQLite. WebAuthn counters are small;
 * coerce to number at read boundaries for app code that expects Prisma semantics.
 */
export function normalizePasskeyCounter(counter: unknown) {
	if (typeof counter === 'bigint') {
		return Number(counter)
	}
	if (typeof counter === 'number') {
		return counter
	}
	if (typeof counter === 'string') {
		return Number(counter)
	}
	return counter
}

/**
 * publicKey is a BLOB. Normalize to Uint8Array for @simplewebauthn consumers.
 */
export function normalizePublicKey(publicKey: unknown) {
	if (publicKey instanceof Uint8Array) {
		return publicKey
	}
	if (publicKey instanceof ArrayBuffer) {
		return new Uint8Array(publicKey)
	}
	if (ArrayBuffer.isView(publicKey)) {
		const view = publicKey as ArrayBufferView
		return new Uint8Array(
			view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
		)
	}
	return publicKey
}
