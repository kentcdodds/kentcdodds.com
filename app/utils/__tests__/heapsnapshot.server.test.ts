import { expect, test } from 'vitest'
import {
	createHeapSnapshot,
	isHeapSnapshotUnavailableError,
} from '../heapsnapshot.server.ts'

test('createHeapSnapshot writes and reads a snapshot file', async () => {
	const bytes = new Uint8Array([1, 2, 3, 4])
	const result = await createHeapSnapshot({
		host: 'example.com',
		now: new Date('2026-01-01T00:00:00.000Z'),
		loadModules: async () => ({
			fs: {
				promises: {
					readFile: async () => bytes,
				},
			},
			os: {
				tmpdir: () => '/tmp',
			},
			path: {
				join: (...parts) => parts.join('/'),
				basename: (value) => value.split('/').pop() ?? value,
			},
			v8: {
				writeHeapSnapshot: (path) => path,
			},
		}),
	})

	expect(result.bytes).toEqual(bytes)
	expect(result.filename).toContain('example.com-2026-01-01 00_00_00_000')
})

test('isHeapSnapshotUnavailableError detects runtime availability errors', () => {
	expect(isHeapSnapshotUnavailableError(new Error('HEAPSNAPSHOT_UNAVAILABLE'))).toBe(
		true,
	)
	expect(isHeapSnapshotUnavailableError(new Error('other'))).toBe(false)
	expect(isHeapSnapshotUnavailableError('nope')).toBe(false)
})
