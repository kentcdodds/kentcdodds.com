import { type Database } from '@remix-run/data-table'
import { getAudioBuffer } from '#app/utils/call-kent-audio-storage.server.ts'
import { normalizeCallerTranscriptForEpisode } from '#app/utils/call-kent-caller-transcript.server.ts'
import { assembleCallKentTranscript } from '#app/utils/call-kent-transcript-template.ts'
import { generateCallKentEpisodeMetadataWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-metadata.server.ts'
import { formatCallKentTranscriptWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts'
import { transcribeMp3WithWorkersAi } from '#app/utils/cloudflare-ai-transcription.server.ts'
import {
	callKentEpisodeDraftCall,
	callKentEpisodeDraftTable,
	callUser,
} from '#app/utils/db/schema.server.ts'
import { getErrorMessage } from '#app/utils/misc.ts'
import { type CallKentTranscriptionProcessingOutcome } from '#app/utils/call-kent-transcription-processing.ts'

export async function startCallKentEpisodeDraftProcessing(
	draftId: string,
	{
		database,
		jobId,
		leaseId,
	}: { database: Database; jobId: string; leaseId: string },
): Promise<CallKentTranscriptionProcessingOutcome> {
	const processingWhere = {
		id: draftId,
		processingJobId: jobId,
		processingLeaseId: leaseId,
		status: 'PROCESSING',
	} as const
	const draft = await database.findOne(callKentEpisodeDraftTable, {
		where: processingWhere,
		with: {
			call: callKentEpisodeDraftCall.with({ user: callUser }),
		},
	})
	if (!draft) return 'stale'
	if (!draft.call) throw new Error('Call not found for episode draft.')
	const call = draft.call
	if (!call.user) throw new Error('Call user not found for episode draft.')

	const callerName = call.isAnonymous ? undefined : call.user.firstName
	const callTitle = call.title
	const callerNotes = call.notes ?? undefined

	// Step 2: transcript (skip if already present)
	let transcript = draft.transcript
	let transcriptForMetadata: string | null = null
	let callerTranscriptForMetadata: string | null = null
	let responderTranscriptForMetadata: string | null = null
	if (!transcript) {
		if (call.callerTranscriptStatus === 'PROCESSING') {
			return 'deferred'
		}
		if (call.callerTranscriptStatus !== 'READY') {
			throw new Error(
				`Caller transcript is not ready (status: ${call.callerTranscriptStatus}).`,
			)
		}
		const savedCallerTranscript = normalizeCallerTranscriptForEpisode({
			callerTranscript: call.callerTranscript,
			callerName,
		})
		if (!savedCallerTranscript) {
			throw new Error('Caller transcript is READY but empty.')
		}
		if (!draft.responseSegmentAudioKey) {
			throw new Error('Episode response segment audio is missing.')
		}
		const stepTranscribe = await database.updateMany(
			callKentEpisodeDraftTable,
			{ step: 'TRANSCRIBING', errorMessage: null },
			{ where: processingWhere },
		)
		if (stepTranscribe.affectedRows !== 1) return 'stale'
		const responseMp3 = await getAudioBuffer({
			key: draft.responseSegmentAudioKey,
		})
		const kentTranscript = await transcribeMp3WithWorkersAi({
			mp3: responseMp3,
			callerName,
			callTitle,
			callerNotes,
		})
		callerTranscriptForMetadata = savedCallerTranscript
		responderTranscriptForMetadata = kentTranscript
		transcript = assembleCallKentTranscript({
			callerName,
			callerTranscript: savedCallerTranscript,
			kentTranscript,
		})
		const rawTranscript = transcript.trim()
		if (!rawTranscript) {
			throw new Error('Workers AI transcription returned an empty transcript.')
		}
		transcriptForMetadata = rawTranscript

		transcript = await formatCallKentTranscriptWithWorkersAi({
			transcript: rawTranscript,
			callTitle,
			callerNotes,
			callerName,
		}).catch((error: unknown) => {
			console.error(
				'Call Kent transcript formatting failed; using unformatted transcript.',
				{ draftId, error: getErrorMessage(error) },
			)
			return rawTranscript
		})
		transcript = transcript.trim()
		if (!transcript) {
			// Should not happen (formatter either returns something or we fall back),
			// but keep the error message clear if it does.
			throw new Error('Transcript formatting returned an empty transcript.')
		}

		const step3 = await database.updateMany(
			callKentEpisodeDraftTable,
			{ transcript, step: 'GENERATING_METADATA' },
			{ where: processingWhere },
		)
		if (step3.affectedRows !== 1) return 'stale'
	}

	if (!transcript) {
		throw new Error('Transcript is missing after transcription/formatting.')
	}

	// Step 3: AI metadata (title/description/keywords) if not already present
	if (!draft.title || !draft.description || !draft.keywords) {
		const stepMetadata = await database.updateMany(
			callKentEpisodeDraftTable,
			{ step: 'GENERATING_METADATA', errorMessage: null },
			{ where: processingWhere },
		)
		if (stepMetadata.affectedRows !== 1) return 'stale'

		const metadata = await generateCallKentEpisodeMetadataWithWorkersAi({
			// Prefer segment transcripts (caller + Kent) for metadata when available.
			...(callerTranscriptForMetadata && responderTranscriptForMetadata
				? {
						callerTranscript: callerTranscriptForMetadata,
						responderTranscript: responderTranscriptForMetadata,
					}
				: { transcript: transcriptForMetadata ?? transcript }),
			callTitle: call.title,
			callerNotes: call.notes,
		})

		const existingTitle = draft.title?.trim()
		const existingDescription = draft.description?.trim()
		const existingKeywords = draft.keywords?.trim()
		const nextTitle = existingTitle || metadata.title.trim()
		const nextDescription = existingDescription || metadata.description.trim()
		const nextKeywords = existingKeywords || metadata.keywords.trim()

		const completed = await database.updateMany(
			callKentEpisodeDraftTable,
			{
				title: nextTitle,
				description: nextDescription,
				keywords: nextKeywords,
				status: 'READY',
				step: 'DONE',
				processingLeaseId: null,
				processingLeaseExpiresAt: null,
			},
			{ where: processingWhere },
		)
		return completed.affectedRows === 1 ? 'completed' : 'stale'
	} else {
		const completed = await database.updateMany(
			callKentEpisodeDraftTable,
			{
				status: 'READY',
				step: 'DONE',
				processingLeaseId: null,
				processingLeaseExpiresAt: null,
			},
			{ where: processingWhere },
		)
		return completed.affectedRows === 1 ? 'completed' : 'stale'
	}
}
