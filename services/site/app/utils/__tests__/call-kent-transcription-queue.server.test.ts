import { expect, test, vi } from 'vitest'
import {
	clearRuntimeBindingSource,
	setRuntimeBindingSource,
} from '../runtime-bindings.server.ts'
import {
	enqueueCallKentTranscriptionJob,
	parseCallKentTranscriptionJob,
} from '../call-kent-transcription-queue.server.ts'

const jobId = '11111111-1111-4111-8111-111111111111'

test('parseCallKentTranscriptionJob accepts only strict versioned jobs', () => {
	expect(
		parseCallKentTranscriptionJob({
			version: 1,
			type: 'caller-transcription',
			callId: 'call-1',
			jobId,
		}),
	).toEqual({
		version: 1,
		type: 'caller-transcription',
		callId: 'call-1',
		jobId,
	})
	expect(
		parseCallKentTranscriptionJob({
			version: 1,
			type: 'episode-draft',
			draftId: 'draft-1',
			jobId,
		}),
	).toEqual({
		version: 1,
		type: 'episode-draft',
		draftId: 'draft-1',
		jobId,
	})
	expect(() =>
		parseCallKentTranscriptionJob({
			version: 2,
			type: 'caller-transcription',
			callId: 'call-1',
			jobId,
		}),
	).toThrow(/version 1/)
	expect(() =>
		parseCallKentTranscriptionJob({
			version: 1,
			type: 'caller-transcription',
			callId: 'call-1',
			jobId,
			extra: true,
		}),
	).toThrow(/unexpected fields/)
	expect(() =>
		parseCallKentTranscriptionJob({
			version: 1,
			type: 'episode-draft',
			draftId: 'draft-1',
			jobId: 'not-a-uuid',
		}),
	).toThrow(/jobId must be a UUID/)
})

test('enqueueCallKentTranscriptionJob detects and awaits a send binding', async () => {
	let resolveSend = () => {}
	const sendPromise = new Promise<void>((resolve) => {
		resolveSend = resolve
	})
	const send = vi.fn(() => sendPromise)
	setRuntimeBindingSource({ CALL_KENT_TRANSCRIPTION_QUEUE: { send } })

	let settled = false
	const enqueuePromise = enqueueCallKentTranscriptionJob({
		version: 1,
		type: 'episode-draft',
		draftId: 'draft-1',
		jobId,
	}).then(() => {
		settled = true
	})
	await Promise.resolve()
	expect(settled).toBe(false)
	resolveSend()
	await enqueuePromise
	expect(send).toHaveBeenCalledWith({
		version: 1,
		type: 'episode-draft',
		draftId: 'draft-1',
		jobId,
	})

	setRuntimeBindingSource({ CALL_KENT_TRANSCRIPTION_QUEUE: {} })
	await expect(
		enqueueCallKentTranscriptionJob({
			version: 1,
			type: 'caller-transcription',
			callId: 'call-1',
			jobId,
		}),
	).rejects.toThrow(/binding with send/)
	clearRuntimeBindingSource()
})
