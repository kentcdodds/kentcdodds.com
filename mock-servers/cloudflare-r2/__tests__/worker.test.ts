import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('cloudflare-r2 mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-r2.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('cloudflare-r2')
	})

	test('supports put head get delete object flow', async () => {
		const putResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'PUT',
				headers: { 'content-type': 'audio/mpeg' },
				body: new Uint8Array([1, 2, 3, 4, 5]),
			}),
			{},
			{},
		)
		expect(putResponse.status).toBe(200)

		const headResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'HEAD',
			}),
			{},
			{},
		)
		expect(headResponse.status).toBe(200)
		expect(headResponse.headers.get('content-type')).toBe('audio/mpeg')

		const getResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3'),
			{},
			{},
		)
		expect(getResponse.status).toBe(200)
		const bytes = new Uint8Array(await getResponse.arrayBuffer())
		expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5])

		const listResponse = await worker.fetch(
			new Request(
				'http://mock-r2.local/my-bucket?list-type=2&prefix=path/to',
			),
			{},
			{},
		)
		expect(listResponse.status).toBe(200)
		const listBody = await listResponse.text()
		expect(listBody).toContain('<Key>path/to/audio.mp3</Key>')

		const deleteResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'DELETE',
			}),
			{},
			{},
		)
		expect(deleteResponse.status).toBe(204)

		const missingHeadResponse = await worker.fetch(
			new Request('http://mock-r2.local/my-bucket/path/to/audio.mp3', {
				method: 'HEAD',
			}),
			{},
			{},
		)
		expect(missingHeadResponse.status).toBe(404)
	})

	test('persists objects to disk-backed cache across memory resets', async () => {
		const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'r2-mock-cache-'))
		try {
			const env = { R2_MOCK_CACHE_DIRECTORY: tempDirectory }
			const putResponse = await worker.fetch(
				new Request('http://mock-r2.local/my-bucket/path/to/offline.png', {
					method: 'PUT',
					headers: { 'content-type': 'image/png' },
					body: new Uint8Array([7, 8, 9]),
				}),
				env,
				{},
			)
			expect(putResponse.status).toBe(200)

			const memoryResetResponse = await worker.fetch(
				new Request('http://mock-r2.local/__mocks/reset?preserveDisk=true', {
					method: 'POST',
				}),
				env,
				{},
			)
			expect(memoryResetResponse.status).toBe(200)

			const restoredResponse = await worker.fetch(
				new Request('http://mock-r2.local/my-bucket/path/to/offline.png'),
				env,
				{},
			)
			expect(restoredResponse.status).toBe(200)
			const restoredBytes = new Uint8Array(await restoredResponse.arrayBuffer())
			expect(Array.from(restoredBytes)).toEqual([7, 8, 9])

			const fullResetResponse = await worker.fetch(
				new Request('http://mock-r2.local/__mocks/reset', { method: 'POST' }),
				env,
				{},
			)
			expect(fullResetResponse.status).toBe(200)

			const missingResponse = await worker.fetch(
				new Request('http://mock-r2.local/my-bucket/path/to/offline.png'),
				env,
				{},
			)
			expect(missingResponse.status).toBe(404)
		} finally {
			await fs.rm(tempDirectory, { recursive: true, force: true })
		}
	})
})
