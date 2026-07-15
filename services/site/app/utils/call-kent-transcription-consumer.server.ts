import {
	and,
	eq,
	inList,
	isNull,
	lt,
	lte,
	notNull,
	or,
	type Database,
} from '@remix-run/data-table'
import { startCallKentCallerTranscriptProcessing } from '#app/utils/call-kent-caller-transcript.server.ts'
import { startCallKentEpisodeDraftProcessing } from '#app/utils/call-kent-episode-draft.server.ts'
import {
	callKentEpisodeDraftTable,
	callTable,
} from '#app/utils/db/schema.server.ts'
import { getErrorMessage } from '#app/utils/misc.ts'
import {
	enqueueCallKentTranscriptionJob,
	parseCallKentTranscriptionJob,
	type CallKentTranscriptionJob,
} from '#app/utils/call-kent-transcription-queue.server.ts'

const MAX_DELIVERY_ATTEMPTS = 3
const PROCESSING_LEASE_MILLISECONDS = 20 * 60 * 1000
const STALE_PROCESSING_MILLISECONDS = 20 * 60 * 1000
const STALE_RECOVERY_PAGE_SIZE = 50

type QueueMessage = {
	body: unknown
	attempts: number
	ack(): void
	retry(): void
}

type QueueBatch = {
	messages: ReadonlyArray<QueueMessage>
}

async function claimJob({
	database,
	job,
	leaseId,
	now,
}: {
	database: Database
	job: CallKentTranscriptionJob
	leaseId: string
	now: Date
}) {
	const leaseExpiresAt = new Date(now.getTime() + PROCESSING_LEASE_MILLISECONDS)
	switch (job.type) {
		case 'caller-transcription': {
			const claimed = await database.updateMany(
				callTable,
				{
					callerTranscriptLeaseId: leaseId,
					callerTranscriptLeaseExpiresAt: leaseExpiresAt,
					callerTranscriptErrorMessage: null,
				},
				{
					where: and(
						eq('id', job.callId),
						eq('callerTranscriptJobId', job.jobId),
						eq('callerTranscriptStatus', 'PROCESSING'),
						or(
							isNull('callerTranscriptLeaseId'),
							isNull('callerTranscriptLeaseExpiresAt'),
							lte('callerTranscriptLeaseExpiresAt', now),
						),
					),
				},
			)
			return claimed.affectedRows === 1
		}
		case 'episode-draft': {
			const claimed = await database.updateMany(
				callKentEpisodeDraftTable,
				{
					processingLeaseId: leaseId,
					processingLeaseExpiresAt: leaseExpiresAt,
					errorMessage: null,
				},
				{
					where: and(
						eq('id', job.draftId),
						eq('processingJobId', job.jobId),
						eq('status', 'PROCESSING'),
						or(
							isNull('processingLeaseId'),
							isNull('processingLeaseExpiresAt'),
							lte('processingLeaseExpiresAt', now),
						),
					),
				},
			)
			return claimed.affectedRows === 1
		}
		default: {
			const exhaustive: never = job
			throw new Error(`Unhandled Call Kent job: ${String(exhaustive)}`)
		}
	}
}

async function releaseLease({
	database,
	job,
	leaseId,
}: {
	database: Database
	job: CallKentTranscriptionJob
	leaseId: string
}) {
	switch (job.type) {
		case 'caller-transcription': {
			await database.updateMany(
				callTable,
				{
					callerTranscriptLeaseId: null,
					callerTranscriptLeaseExpiresAt: null,
				},
				{
					where: {
						id: job.callId,
						callerTranscriptJobId: job.jobId,
						callerTranscriptLeaseId: leaseId,
						callerTranscriptStatus: 'PROCESSING',
					},
				},
			)
			return
		}
		case 'episode-draft': {
			await database.updateMany(
				callKentEpisodeDraftTable,
				{ processingLeaseId: null, processingLeaseExpiresAt: null },
				{
					where: {
						id: job.draftId,
						processingJobId: job.jobId,
						processingLeaseId: leaseId,
						status: 'PROCESSING',
					},
				},
			)
			return
		}
		default: {
			const exhaustive: never = job
			throw new Error(`Unhandled Call Kent job: ${String(exhaustive)}`)
		}
	}
}

async function recordTerminalError({
	database,
	job,
	leaseId,
	error,
}: {
	database: Database
	job: CallKentTranscriptionJob
	leaseId: string
	error: unknown
}) {
	const errorMessage = getErrorMessage(error)
	switch (job.type) {
		case 'caller-transcription': {
			await database.updateMany(
				callTable,
				{
					callerTranscriptStatus: 'ERROR',
					callerTranscriptErrorMessage: errorMessage,
					callerTranscriptLeaseId: null,
					callerTranscriptLeaseExpiresAt: null,
				},
				{
					where: {
						id: job.callId,
						callerTranscriptJobId: job.jobId,
						callerTranscriptLeaseId: leaseId,
						callerTranscriptStatus: 'PROCESSING',
					},
				},
			)
			return
		}
		case 'episode-draft': {
			await database.updateMany(
				callKentEpisodeDraftTable,
				{
					status: 'ERROR',
					errorMessage,
					step: 'DONE',
					processingLeaseId: null,
					processingLeaseExpiresAt: null,
				},
				{
					where: {
						id: job.draftId,
						processingJobId: job.jobId,
						processingLeaseId: leaseId,
						status: 'PROCESSING',
					},
				},
			)
			return
		}
		default: {
			const exhaustive: never = job
			throw new Error(`Unhandled Call Kent job: ${String(exhaustive)}`)
		}
	}
}

export async function consumeCallKentTranscriptionBatch(
	batch: QueueBatch,
	{
		database,
		processCaller = startCallKentCallerTranscriptProcessing,
		processDraft = startCallKentEpisodeDraftProcessing,
		now = () => Date.now(),
		createLeaseId = () => crypto.randomUUID(),
	}: {
		database: Database
		processCaller?: typeof startCallKentCallerTranscriptProcessing
		processDraft?: typeof startCallKentEpisodeDraftProcessing
		now?: () => number
		createLeaseId?: () => string
	},
) {
	for (const message of batch.messages) {
		let job: CallKentTranscriptionJob
		try {
			job = parseCallKentTranscriptionJob(message.body)
		} catch (error: unknown) {
			console.error('Discarding invalid Call Kent transcription job.', {
				error: getErrorMessage(error),
			})
			message.ack()
			continue
		}

		const leaseId = createLeaseId()
		const claimed = await claimJob({
			database,
			job,
			leaseId,
			now: new Date(now()),
		})
		if (!claimed) {
			message.ack()
			continue
		}

		try {
			switch (job.type) {
				case 'caller-transcription': {
					await processCaller(job.callId, {
						database,
						jobId: job.jobId,
						leaseId,
					})
					break
				}
				case 'episode-draft': {
					await processDraft(job.draftId, {
						database,
						jobId: job.jobId,
						leaseId,
					})
					break
				}
				default: {
					const exhaustive: never = job
					throw new Error(`Unhandled Call Kent job: ${String(exhaustive)}`)
				}
			}
			message.ack()
		} catch (error: unknown) {
			if (message.attempts < MAX_DELIVERY_ATTEMPTS) {
				await releaseLease({ database, job, leaseId })
				message.retry()
				continue
			}
			await recordTerminalError({ database, job, leaseId, error })
			message.ack()
		}
	}
}

async function touchDispatchedJob({
	database,
	job,
	dispatchedAt,
}: {
	database: Database
	job: CallKentTranscriptionJob
	dispatchedAt: Date
}) {
	switch (job.type) {
		case 'caller-transcription': {
			await database.updateMany(
				callTable,
				{ updatedAt: dispatchedAt },
				{
					where: {
						id: job.callId,
						callerTranscriptJobId: job.jobId,
						callerTranscriptStatus: 'PROCESSING',
					},
				},
			)
			return
		}
		case 'episode-draft': {
			await database.updateMany(
				callKentEpisodeDraftTable,
				{ updatedAt: dispatchedAt },
				{
					where: {
						id: job.draftId,
						processingJobId: job.jobId,
						status: 'PROCESSING',
					},
				},
			)
			return
		}
		default: {
			const exhaustive: never = job
			throw new Error(`Unhandled Call Kent job: ${String(exhaustive)}`)
		}
	}
}

export async function reenqueueStaleCallKentTranscriptionJobs({
	database,
	enqueue = enqueueCallKentTranscriptionJob,
	now = Date.now(),
}: {
	database: Database
	enqueue?: (job: CallKentTranscriptionJob) => Promise<void>
	now?: number
}) {
	const staleBefore = new Date(now - STALE_PROCESSING_MILLISECONDS)
	const [calls, drafts] = await Promise.all([
		database.findMany(callTable, {
			where: and(
				eq('callerTranscriptStatus', 'PROCESSING'),
				notNull('callerTranscriptJobId'),
				lt('updatedAt', staleBefore),
			),
			orderBy: ['updatedAt', 'asc'],
			limit: STALE_RECOVERY_PAGE_SIZE,
		}),
		database.findMany(callKentEpisodeDraftTable, {
			where: and(
				eq('status', 'PROCESSING'),
				notNull('processingJobId'),
				or(
					notNull('episodeAudioKey'),
					and(
						notNull('callerSegmentAudioKey'),
						notNull('responseSegmentAudioKey'),
					),
				),
				inList('step', ['TRANSCRIBING', 'GENERATING_METADATA']),
				lt('updatedAt', staleBefore),
			),
			orderBy: ['updatedAt', 'asc'],
			limit: STALE_RECOVERY_PAGE_SIZE,
		}),
	])
	const jobs: Array<CallKentTranscriptionJob> = [
		...calls.flatMap((call) =>
			call.callerTranscriptJobId
				? [
						{
							version: 1 as const,
							type: 'caller-transcription' as const,
							callId: call.id,
							jobId: call.callerTranscriptJobId,
						},
					]
				: [],
		),
		...drafts.flatMap((draft) =>
			draft.processingJobId
				? [
						{
							version: 1 as const,
							type: 'episode-draft' as const,
							draftId: draft.id,
							jobId: draft.processingJobId,
						},
					]
				: [],
		),
	]

	const dispatchedAt = new Date(now)
	const results = await Promise.allSettled(
		jobs.map(async (job) => {
			await enqueue(job)
			await touchDispatchedJob({ database, job, dispatchedAt })
		}),
	)
	for (const [index, result] of results.entries()) {
		if (result.status === 'rejected') {
			console.error('Unable to re-enqueue stale Call Kent transcription job.', {
				job: jobs[index],
				error: getErrorMessage(result.reason),
			})
		}
	}
	return {
		selected: jobs.length,
		enqueued: results.filter((result) => result.status === 'fulfilled').length,
	}
}
