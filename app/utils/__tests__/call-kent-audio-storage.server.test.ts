import { Readable } from 'node:stream'
import { describe, expect, test, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
	objects: new Map<string, { body: Uint8Array; contentType: string }>(),
}))

function resetMockObjects() {
	mockState.objects.clear()
}

vi.mock('@aws-sdk/client-s3', () => {
	class PutObjectCommand {
		input: {
			Bucket: string
			Key: string
			Body: Uint8Array
			ContentType: string
		}
		constructor(input: {
			Bucket: string
			Key: string
			Body: Uint8Array
			ContentType: string
		}) {
			this.input = input
		}
	}

	class GetObjectCommand {
		input: {
			Bucket: string
			Key: string
			Range?: string
		}
		constructor(input: { Bucket: string; Key: string; Range?: string }) {
			this.input = input
		}
	}

	class HeadObjectCommand {
		input: {
			Bucket: string
			Key: string
		}
		constructor(input: { Bucket: string; Key: string }) {
			this.input = input
		}
	}

	class DeleteObjectCommand {
		input: {
			Bucket: string
			Key: string
		}
		constructor(input: { Bucket: string; Key: string }) {
			this.input = input
		}
	}

	class S3Client {
		async send(command: unknown) {
			if (command instanceof PutObjectCommand) {
				mockState.objects.set(command.input.Key, {
					body: command.input.Body,
					contentType: command.input.ContentType,
				})
				return {}
			}
			if (command instanceof GetObjectCommand) {
				const object = mockState.objects.get(command.input.Key)
				if (!object) {
					const error = new Error('NoSuchKey')
					;(error as Error & { name: string }).name = 'NoSuchKey'
					throw error
				}
				let body = object.body
				const rangeHeader = command.input.Range
				if (rangeHeader) {
					const match = /^bytes=(?<start>\d+)-(?<end>\d+)$/.exec(rangeHeader)
					const start = Number(match?.groups?.start)
					const end = Number(match?.groups?.end)
					body = body.slice(start, end + 1)
				}
				return {
					Body: Readable.from([body]),
				}
			}
			if (command instanceof HeadObjectCommand) {
				const object = mockState.objects.get(command.input.Key)
				if (!object) {
					const error = new Error('NoSuchKey')
					;(error as Error & { name: string }).name = 'NoSuchKey'
					throw error
				}
				return {
					ContentLength: object.body.byteLength,
					ContentType: object.contentType,
				}
			}
			if (command instanceof DeleteObjectCommand) {
				mockState.objects.delete(command.input.Key)
				return {}
			}
			throw new Error(`Unexpected S3 command: ${String(command)}`)
		}
	}

	return {
		DeleteObjectCommand,
		GetObjectCommand,
		HeadObjectCommand,
		PutObjectCommand,
		S3Client,
	}
})

import {
	deleteAudioObject,
	getAudioBuffer,
	getAudioStream,
	headAudioObject,
	putCallAudioFromBuffer,
} from '../call-kent-audio-storage.server.ts'

process.env.R2_BUCKET = 'mock-r2-bucket'
process.env.R2_ENDPOINT = 'https://mock.r2.cloudflarestorage.com'
process.env.R2_ACCESS_KEY_ID = 'MOCKR2ACCESSKEYID'
process.env.R2_SECRET_ACCESS_KEY = 'MOCKR2SECRETACCESSKEY'
process.env.CALL_KENT_R2_BUCKET = 'mock-call-kent-audio'

describe('call kent audio storage', () => {
	test('round-trips audio bytes and supports range reads', async () => {
		resetMockObjects()
		const callId = 'call_123'
		const original = new Uint8Array([0, 1, 2, 3, 4, 5, 250, 251, 252, 253])
		const contentType = 'audio/webm;codecs=opus'

		const putRes = await putCallAudioFromBuffer({
			callId,
			audio: original,
			contentType,
		})
		expect(putRes.size).toBe(original.byteLength)
		expect(putRes.key).toContain(`call-kent/calls/${callId}/`)

		const full = await getAudioBuffer({ key: putRes.key })
		expect(new Uint8Array(full)).toEqual(original)

		const { body } = await getAudioStream({
			key: putRes.key,
			range: { start: 2, end: 5 },
		})
		const chunks: Buffer[] = []
		for await (const chunk of body) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}
		const ranged = new Uint8Array(Buffer.concat(chunks))
		expect(ranged).toEqual(original.slice(2, 6))

		await deleteAudioObject({ key: putRes.key })
		await expect(getAudioBuffer({ key: putRes.key })).rejects.toThrow()
	})

	test('supports HEAD lookups for object size', async () => {
		resetMockObjects()
		const callId = 'call_456'
		const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7])
		const contentType = 'audio/webm;codecs=opus'

		const putRes = await putCallAudioFromBuffer({
			callId,
			audio: original,
			contentType,
		})

		const head = await headAudioObject({ key: putRes.key })
		expect(head.size).toBe(original.byteLength)
		expect(head.contentType).toBe(contentType)

		await deleteAudioObject({ key: putRes.key })
	})
})
