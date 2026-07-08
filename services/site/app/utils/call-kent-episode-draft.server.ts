import { getAudioBuffer } from '#app/utils/call-kent-audio-storage.server.ts'
import { normalizeCallerTranscriptForEpisode } from '#app/utils/call-kent-caller-transcript.server.ts'
import { assembleCallKentTranscript } from '#app/utils/call-kent-transcript-template.ts'
import { generateCallKentEpisodeMetadataWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-metadata.server.ts'
import { formatCallKentTranscriptWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts'
import { transcribeMp3WithWorkersAi } from '#app/utils/cloudflare-ai-transcription.server.ts'
import { db } from '#app/utils/db.server.ts'
import {
	callKentEpisodeDraftCall,
	callKentEpisodeDraftTable,
	callUser,
} from '#app/utils/db/schema.server.ts'
import { getErrorMessage } from '#app/utils/misc.ts'

export async function startCallKentEpisodeDraftProcessing(draftId: string) {
	// Fire-and-forget background work; errors are recorded on the draft row.
	try {
		const draft = await db.findOne(callKentEpisodeDraftTable, {
			where: { id: draftId },
			with: {
				call: callKentEpisodeDraftCall.with({ user: callUser }),
			},
		})
		if (!draft) return
		if (draft.status !== 'PROCESSING') return
		if (!draft.call) return
		const call = draft.call
		if (!call.user) return

		// Step 1: episode audio (stitch + persist) if needed
		let episodeMp3: Buffer
		let segmentMp3s: { callerMp3: Buffer; responseMp3: Buffer } | null = null
		if (draft.episodeAudioKey) {
			episodeMp3 = await getAudioBuffer({ key: draft.episodeAudioKey })
		} else {
			throw new Error(
				'Episode audio is missing. Audio generation must complete before draft processing can continue.',
			)
		}

		// Step 2: transcript (skip if already present)
		let transcript = draft.transcript
		let transcriptForMetadata: string | null = null
		let callerTranscriptForMetadata: string | null = null
		let responderTranscriptForMetadata: string | null = null
		if (!transcript) {
			const stepTranscribe = await db.updateMany(
				callKentEpisodeDraftTable,
				{ step: 'TRANSCRIBING', errorMessage: null },
				{ where: { id: draftId, status: 'PROCESSING' } },
			)
			if (stepTranscribe.affectedRows !== 1) return
			const callerName = call.isAnonymous ? undefined : call.user.firstName
			const callTitle = call.title
			const callerNotes = call.notes ?? undefined
			const savedCallerTranscript = normalizeCallerTranscriptForEpisode({
				callerTranscript: call.callerTranscript,
				callerName,
			})

			if (
				!segmentMp3s &&
				draft.callerSegmentAudioKey &&
				draft.responseSegmentAudioKey
			) {
				const [callerMp3, responseMp3] = await Promise.all([
					getAudioBuffer({ key: draft.callerSegmentAudioKey }),
					getAudioBuffer({ key: draft.responseSegmentAudioKey }),
				])
				segmentMp3s = { callerMp3, responseMp3 }
			}

			if (segmentMp3s) {
				const callerTranscriptPromise = savedCallerTranscript
					? Promise.resolve(savedCallerTranscript)
					: transcribeMp3WithWorkersAi({
							mp3: segmentMp3s.callerMp3,
							callerName,
							callTitle,
							callerNotes,
						})
				const [callerTranscript, kentTranscript] = await Promise.all([
					callerTranscriptPromise,
					transcribeMp3WithWorkersAi({
						mp3: segmentMp3s.responseMp3,
						callerName,
						callTitle,
						callerNotes,
					}),
				])
				callerTranscriptForMetadata = callerTranscript
				responderTranscriptForMetadata = kentTranscript
				transcript = assembleCallKentTranscript({
					callerName,
					callerTranscript,
					kentTranscript,
				})
			} else {
				// Fallback: transcribe the stitched episode audio (includes bumpers).
				transcript = await transcribeMp3WithWorkersAi({
					mp3: episodeMp3,
					callerName,
					callTitle,
					callerNotes,
				})
			}
			const rawTranscript = transcript.trim()
			if (!rawTranscript) {
				throw new Error(
					'Workers AI transcription returned an empty transcript.',
				)
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

			const step3 = await db.updateMany(
				callKentEpisodeDraftTable,
				{ transcript, step: 'GENERATING_METADATA' },
				{ where: { id: draftId, status: 'PROCESSING' } },
			)
			if (step3.affectedRows !== 1) return
		}

		if (!transcript) {
			throw new Error('Transcript is missing after transcription/formatting.')
		}

		// Step 3: AI metadata (title/description/keywords) if not already present
		if (!draft.title || !draft.description || !draft.keywords) {
			const stepMetadata = await db.updateMany(
				callKentEpisodeDraftTable,
				{ step: 'GENERATING_METADATA', errorMessage: null },
				{ where: { id: draftId, status: 'PROCESSING' } },
			)
			if (stepMetadata.affectedRows !== 1) return

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

			await db.updateMany(
				callKentEpisodeDraftTable,
				{
					title: nextTitle,
					description: nextDescription,
					keywords: nextKeywords,
					status: 'READY',
					step: 'DONE',
				},
				{ where: { id: draftId, status: 'PROCESSING' } },
			)
		} else {
			await db.updateMany(
				callKentEpisodeDraftTable,
				{ status: 'READY', step: 'DONE' },
				{ where: { id: draftId, status: 'PROCESSING' } },
			)
		}
	} catch (error: unknown) {
		const message = getErrorMessage(error)
		// Only record the error if the draft still exists and is in progress.
		await db.updateMany(
			callKentEpisodeDraftTable,
			{ status: 'ERROR', errorMessage: message, step: 'DONE' },
			{ where: { id: draftId, status: 'PROCESSING' } },
		)
	}
}
