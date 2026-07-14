import { type Database } from '@remix-run/data-table'
import { expect, test, vi } from 'vitest'

const jobId = '11111111-1111-4111-8111-111111111111'
const leaseId = '22222222-2222-4222-8222-222222222222'

async function loadCallerModule() {
	vi.resetModules()
	const getAudioBuffer = vi.fn(async () => Buffer.from('caller audio'))
	const transcribeMp3WithWorkersAi = vi.fn(async () => 'raw transcript')
	const formatCallKentTranscriptWithWorkersAi = vi.fn(
		async () => 'Riley: formatted transcript',
	)
	vi.doMock('#app/utils/call-kent-audio-storage.server.ts', () => ({
		getAudioBuffer,
	}))
	vi.doMock('#app/utils/cloudflare-ai-transcription.server.ts', () => ({
		transcribeMp3WithWorkersAi,
	}))
	vi.doMock(
		'#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts',
		() => ({ formatCallKentTranscriptWithWorkersAi }),
	)
	const mod = await import('../call-kent-caller-transcript.server.ts')
	return {
		getAudioBuffer,
		transcribeMp3WithWorkersAi,
		formatCallKentTranscriptWithWorkersAi,
		...mod,
	}
}

test('caller transcript success is guarded by job and lease ownership', async () => {
	const { startCallKentCallerTranscriptProcessing } = await loadCallerModule()
	const findOne = vi.fn(async () => ({
		id: 'call-1',
		title: 'Question',
		notes: null,
		isAnonymous: false,
		audioKey: 'caller.mp3',
		callerTranscriptJobId: jobId,
		callerTranscriptLeaseId: leaseId,
		callerTranscriptStatus: 'PROCESSING',
		user: { firstName: 'Riley' },
	}))
	const updateMany = vi.fn(async () => ({ affectedRows: 1 }))

	await startCallKentCallerTranscriptProcessing('call-1', {
		database: { findOne, updateMany } as unknown as Database,
		jobId,
		leaseId,
	})

	expect(updateMany).toHaveBeenLastCalledWith(
		expect.anything(),
		{
			callerTranscript: 'Riley: formatted transcript',
			callerTranscriptStatus: 'READY',
			callerTranscriptErrorMessage: null,
			callerTranscriptLeaseId: null,
			callerTranscriptLeaseExpiresAt: null,
		},
		{
			where: {
				id: 'call-1',
				callerTranscriptJobId: jobId,
				callerTranscriptLeaseId: leaseId,
				callerTranscriptStatus: 'PROCESSING',
			},
		},
	)
})
