import { WorkerEntrypoint } from 'cloudflare:workers'
import {
	parseCallKentTranscriptionJob,
	type CallKentTranscriptionJob,
} from '../../../site/app/utils/call-kent-transcription-queue.server.ts'
import type { ParentWorkerEnv } from './types.ts'

export class CallKentTranscriptionQueueRpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async send(job: CallKentTranscriptionJob) {
		await this.env.CALL_KENT_TRANSCRIPTION_QUEUE.send(
			parseCallKentTranscriptionJob(job),
		)
	}
}
