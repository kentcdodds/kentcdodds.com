import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'

export type CallKentTranscriptionJob =
	| {
			version: 1
			type: 'caller-transcription'
			callId: string
			jobId: string
	  }
	| { version: 1; type: 'episode-draft'; draftId: string; jobId: string }

type QueueSender = {
	send(message: CallKentTranscriptionJob): Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
	value: Record<string, unknown>,
	keys: ReadonlyArray<string>,
) {
	const actualKeys = Object.keys(value).sort()
	const expectedKeys = [...keys].sort()
	return (
		actualKeys.length === expectedKeys.length &&
		actualKeys.every((key, index) => key === expectedKeys[index])
	)
}

function parseNonEmptyId(value: unknown, name: string) {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`Invalid Call Kent transcription job: ${name} is required.`)
	}
	return value
}

function parseUuid(value: unknown, name: string) {
	const parsed = parseNonEmptyId(value, name)
	if (
		!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(parsed)
	) {
		throw new Error(
			`Invalid Call Kent transcription job: ${name} must be a UUID.`,
		)
	}
	return parsed
}

export function parseCallKentTranscriptionJob(
	value: unknown,
): CallKentTranscriptionJob {
	if (!isRecord(value) || value.version !== 1) {
		throw new Error('Invalid Call Kent transcription job: expected version 1.')
	}

	switch (value.type) {
		case 'caller-transcription': {
			if (!hasExactKeys(value, ['version', 'type', 'callId', 'jobId'])) {
				throw new Error(
					'Invalid Call Kent caller transcription job: unexpected fields.',
				)
			}
			return {
				version: 1,
				type: 'caller-transcription',
				callId: parseNonEmptyId(value.callId, 'callId'),
				jobId: parseUuid(value.jobId, 'jobId'),
			}
		}
		case 'episode-draft': {
			if (!hasExactKeys(value, ['version', 'type', 'draftId', 'jobId'])) {
				throw new Error(
					'Invalid Call Kent episode draft job: unexpected fields.',
				)
			}
			return {
				version: 1,
				type: 'episode-draft',
				draftId: parseNonEmptyId(value.draftId, 'draftId'),
				jobId: parseUuid(value.jobId, 'jobId'),
			}
		}
		default:
			throw new Error('Invalid Call Kent transcription job: unsupported type.')
	}
}

function isQueueSender(value: unknown): value is QueueSender {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { send?: unknown }).send === 'function'
	)
}

export async function enqueueCallKentTranscriptionJob(
	job: CallKentTranscriptionJob,
) {
	const parsedJob = parseCallKentTranscriptionJob(job)
	const binding = getRuntimeBinding('CALL_KENT_TRANSCRIPTION_QUEUE')
	if (!isQueueSender(binding)) {
		throw new Error(
			'CALL_KENT_TRANSCRIPTION_QUEUE binding with send() is required.',
		)
	}
	await binding.send(parsedJob)
}
