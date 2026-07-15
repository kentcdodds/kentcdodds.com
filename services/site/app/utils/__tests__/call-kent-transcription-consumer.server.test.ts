import { type Database } from '@remix-run/data-table'
import { expect, test, vi } from 'vitest'
import { callKentEpisodeDraftTable, callTable } from '../db/schema.server.ts'
import {
	consumeCallKentTranscriptionBatch,
	reenqueueStaleCallKentTranscriptionJobs,
} from '../call-kent-transcription-consumer.server.ts'
import { type CallKentTranscriptionJob } from '../call-kent-transcription-queue.server.ts'

const callerJobId = '11111111-1111-4111-8111-111111111111'
const draftJobId = '22222222-2222-4222-8222-222222222222'
const leaseId = '33333333-3333-4333-8333-333333333333'
const now = new Date('2026-07-14T22:00:00.000Z')

function createMessage(body: CallKentTranscriptionJob, attempts: number) {
	return {
		body,
		attempts,
		ack: vi.fn(),
		retry: vi.fn(),
	}
}

function createUpdateManyMock(affectedRows = 1) {
	return vi.fn(
		async (_table: unknown, _changes: unknown, _options: unknown) => ({
			affectedRows,
		}),
	)
}

const jobs = [
	{
		name: 'caller transcription',
		job: {
			version: 1,
			type: 'caller-transcription',
			callId: 'call-1',
			jobId: callerJobId,
		} as const,
	},
	{
		name: 'episode draft',
		job: {
			version: 1,
			type: 'episode-draft',
			draftId: 'draft-1',
			jobId: draftJobId,
		} as const,
	},
]

test.each(jobs)(
	'$name claims a lease before processing and acknowledges',
	async ({ job }) => {
		const message = createMessage(job, 1)
		const updateMany = createUpdateManyMock()
		const processCaller = vi.fn(async () => {})
		const processDraft = vi.fn(async () => {})

		await consumeCallKentTranscriptionBatch(
			{ messages: [message] },
			{
				database: { updateMany } as unknown as Database,
				processCaller,
				processDraft,
				now: () => now.getTime(),
				createLeaseId: () => leaseId,
			},
		)

		expect(updateMany).toHaveBeenCalledTimes(1)
		expect(updateMany.mock.calls[0]?.[1]).toMatchObject(
			job.type === 'caller-transcription'
				? {
						callerTranscriptLeaseId: leaseId,
						callerTranscriptLeaseExpiresAt: new Date(
							'2026-07-14T22:20:00.000Z',
						),
					}
				: {
						processingLeaseId: leaseId,
						processingLeaseExpiresAt: new Date('2026-07-14T22:20:00.000Z'),
					},
		)
		expect(updateMany.mock.calls[0]?.[2]).toMatchObject({
			where: {
				type: 'logical',
				operator: 'and',
				predicates: expect.arrayContaining([
					expect.objectContaining({
						type: 'comparison',
						operator: 'eq',
						column:
							job.type === 'caller-transcription'
								? 'callerTranscriptJobId'
								: 'processingJobId',
						value: job.jobId,
					}),
					expect.objectContaining({
						type: 'logical',
						operator: 'or',
					}),
				]),
			},
		})
		const processor =
			job.type === 'caller-transcription' ? processCaller : processDraft
		expect(processor).toHaveBeenCalledWith(
			job.type === 'caller-transcription' ? job.callId : job.draftId,
			{ database: expect.anything(), jobId: job.jobId, leaseId },
		)
		expect(message.ack).toHaveBeenCalledOnce()
		expect(message.retry).not.toHaveBeenCalled()
	},
)

test.each(jobs)(
	'$name acknowledges a duplicate or stale job without processing',
	async ({ job }) => {
		const message = createMessage(job, 1)
		const processCaller = vi.fn()
		const processDraft = vi.fn()

		await consumeCallKentTranscriptionBatch(
			{ messages: [message] },
			{
				database: {
					updateMany: createUpdateManyMock(0),
				} as unknown as Database,
				processCaller,
				processDraft,
				createLeaseId: () => leaseId,
			},
		)

		expect(processCaller).not.toHaveBeenCalled()
		expect(processDraft).not.toHaveBeenCalled()
		expect(message.ack).toHaveBeenCalledOnce()
		expect(message.retry).not.toHaveBeenCalled()
	},
)

test.each(jobs)(
	'$name releases its matching lease before retrying',
	async ({ job }) => {
		const message = createMessage(job, 2)
		const updateMany = createUpdateManyMock()
		const processCaller = vi.fn(async () => {
			throw new Error('temporary failure')
		})
		const processDraft = vi.fn(async () => {
			throw new Error('temporary failure')
		})

		await consumeCallKentTranscriptionBatch(
			{ messages: [message] },
			{
				database: { updateMany } as unknown as Database,
				processCaller,
				processDraft,
				createLeaseId: () => leaseId,
			},
		)

		expect(updateMany).toHaveBeenCalledTimes(2)
		expect(updateMany.mock.calls[1]?.[1]).toMatchObject(
			job.type === 'caller-transcription'
				? {
						callerTranscriptLeaseId: null,
						callerTranscriptLeaseExpiresAt: null,
					}
				: {
						processingLeaseId: null,
						processingLeaseExpiresAt: null,
					},
		)
		expect(updateMany.mock.calls[1]?.[2]).toEqual({
			where:
				job.type === 'caller-transcription'
					? {
							id: job.callId,
							callerTranscriptJobId: job.jobId,
							callerTranscriptLeaseId: leaseId,
							callerTranscriptStatus: 'PROCESSING',
						}
					: {
							id: job.draftId,
							processingJobId: job.jobId,
							processingLeaseId: leaseId,
							status: 'PROCESSING',
						},
		})
		expect(message.retry).toHaveBeenCalledOnce()
		expect(message.ack).not.toHaveBeenCalled()
	},
)

test.each(jobs)(
	'$name records final ERROR only for its matching job and lease',
	async ({ job }) => {
		const message = createMessage(job, 3)
		const updateMany = createUpdateManyMock()
		const processCaller = vi.fn(async () => {
			throw new Error('permanent failure')
		})
		const processDraft = vi.fn(async () => {
			throw new Error('permanent failure')
		})

		await consumeCallKentTranscriptionBatch(
			{ messages: [message] },
			{
				database: { updateMany } as unknown as Database,
				processCaller,
				processDraft,
				createLeaseId: () => leaseId,
			},
		)

		expect(updateMany).toHaveBeenCalledTimes(2)
		expect(updateMany.mock.calls[1]?.[2]).toEqual({
			where:
				job.type === 'caller-transcription'
					? {
							id: job.callId,
							callerTranscriptJobId: job.jobId,
							callerTranscriptLeaseId: leaseId,
							callerTranscriptStatus: 'PROCESSING',
						}
					: {
							id: job.draftId,
							processingJobId: job.jobId,
							processingLeaseId: leaseId,
							status: 'PROCESSING',
						},
		})
		expect(message.ack).toHaveBeenCalledOnce()
		expect(message.retry).not.toHaveBeenCalled()
	},
)

test('stale recovery uses stored job IDs, bounded ordered pages, and touches dispatched rows', async () => {
	const findMany = vi.fn(
		async (table: unknown, _options: Record<string, unknown>) => {
			if (table === callTable) {
				return [
					{ id: 'call-1', callerTranscriptJobId: callerJobId },
					{ id: 'legacy-call', callerTranscriptJobId: null },
				]
			}
			return [
				{ id: 'draft-1', processingJobId: draftJobId },
				{ id: 'legacy-draft', processingJobId: null },
			]
		},
	)
	const updateMany = createUpdateManyMock()
	const enqueue = vi.fn(async (_job: CallKentTranscriptionJob) => {})

	const result = await reenqueueStaleCallKentTranscriptionJobs({
		database: { findMany, updateMany } as unknown as Database,
		enqueue,
		now: now.getTime(),
	})

	for (const [table, options] of findMany.mock.calls) {
		expect(options).toMatchObject({
			orderBy: ['updatedAt', 'asc'],
			limit: 50,
		})
		expect(options.where).toMatchObject({
			type: 'logical',
			operator: 'and',
			predicates: expect.arrayContaining([
				expect.objectContaining({
					type: 'null',
					operator: 'notNull',
					column:
						table === callTable ? 'callerTranscriptJobId' : 'processingJobId',
				}),
			]),
		})
	}
	const draftQuery = findMany.mock.calls.find(
		([table]) => table === callKentEpisodeDraftTable,
	)?.[1]
	expect(draftQuery?.where).toMatchObject({
		predicates: expect.arrayContaining([
			expect.objectContaining({
				type: 'logical',
				operator: 'or',
				predicates: expect.arrayContaining([
					expect.objectContaining({
						type: 'null',
						operator: 'notNull',
						column: 'episodeAudioKey',
					}),
					expect.objectContaining({
						type: 'logical',
						operator: 'and',
					}),
				]),
			}),
		]),
	})
	expect(enqueue.mock.calls.map(([job]) => job)).toEqual([
		{
			version: 1,
			type: 'caller-transcription',
			callId: 'call-1',
			jobId: callerJobId,
		},
		{
			version: 1,
			type: 'episode-draft',
			draftId: 'draft-1',
			jobId: draftJobId,
		},
	])
	expect(updateMany).toHaveBeenCalledWith(
		callTable,
		{ updatedAt: now },
		{
			where: {
				id: 'call-1',
				callerTranscriptJobId: callerJobId,
				callerTranscriptStatus: 'PROCESSING',
			},
		},
	)
	expect(updateMany).toHaveBeenCalledWith(
		callKentEpisodeDraftTable,
		{ updatedAt: now },
		{
			where: {
				id: 'draft-1',
				processingJobId: draftJobId,
				status: 'PROCESSING',
			},
		},
	)
	expect(result).toEqual({ selected: 2, enqueued: 2 })
})
