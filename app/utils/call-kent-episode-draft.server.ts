import {
	getAudioBuffer,
	parseBase64DataUrl,
	putCallAudioFromBuffer,
	putEpisodeDraftAudioFromBuffer,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { assembleCallKentTranscript } from '#app/utils/call-kent-transcript-template.ts'
import { generateCallKentEpisodeMetadataWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-metadata.server.ts'
import {
	transcribeMp3WithWorkersAi,
} from '#app/utils/cloudflare-ai-transcription.server.ts'
import { createEpisodeAudio } from '#app/utils/ffmpeg.server.ts'
import { getErrorMessage } from '#app/utils/misc.ts'
import { prisma } from '#app/utils/prisma.server.ts'

export async function startCallKentEpisodeDraftProcessing(
	draftId: string,
	{ responseBase64 }: { responseBase64?: string | null } = {},
) {
	// Fire-and-forget background work; errors are recorded on the draft row.
	try {
		const draft = await prisma.callKentEpisodeDraft.findUnique({
			where: { id: draftId },
			include: {
				call: {
					select: {
						id: true,
						title: true,
						notes: true,
						isAnonymous: true,
						audioKey: true,
						base64: true, // legacy fallback (pre-R2)
						user: { select: { firstName: true } },
					},
				},
			},
		})
		if (!draft) return
		if (draft.status !== 'PROCESSING') return

		// Caller audio (from R2 or legacy base64)
		let callAudio: Buffer | null = null
		if (draft.call.audioKey) {
			callAudio = await getAudioBuffer({ key: draft.call.audioKey })
		} else if (draft.call.base64) {
			const parsed = parseBase64DataUrl(draft.call.base64)
			callAudio = parsed.buffer
			// Best-effort migration of legacy DB-stored audio into R2/disk storage.
			try {
				const stored = await putCallAudioFromBuffer({
					callId: draft.call.id,
					audio: callAudio,
					contentType: parsed.contentType,
				})
				await prisma.call.updateMany({
					where: { id: draft.call.id, audioKey: null },
					data: {
						audioKey: stored.key,
						audioContentType: stored.contentType,
						audioSize: stored.size,
						base64: null,
					},
				})
			} catch {
				// Keep going; we can still generate the episode from the legacy audio.
			}
		}
		if (!callAudio) {
			throw new Error('Call audio is missing (no R2 key and no legacy base64).')
		}

		// Step 1: episode audio (stitch + persist) if needed
		let episodeMp3: Buffer
		let segmentMp3s: { callerMp3: Buffer; responseMp3: Buffer } | null = null
		if (draft.episodeAudioKey) {
			episodeMp3 = await getAudioBuffer({ key: draft.episodeAudioKey })
		} else {
			if (!responseBase64) {
				throw new Error(
					'Response audio is required to generate episode audio (no episode audio on draft).',
				)
			}

			const step1 = await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: { step: 'GENERATING_AUDIO', errorMessage: null },
			})
			if (step1.count !== 1) return

			const responseAudio = parseBase64DataUrl(responseBase64).buffer
			const created = await createEpisodeAudio(callAudio, responseAudio)
			episodeMp3 = created.episodeMp3
			segmentMp3s = {
				callerMp3: created.callerMp3,
				responseMp3: created.responseMp3,
			}
			const stored = await putEpisodeDraftAudioFromBuffer({
				draftId,
				mp3: episodeMp3,
			})

			const step2 = await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: {
					episodeAudioKey: stored.key,
					episodeAudioContentType: stored.contentType,
					episodeAudioSize: stored.size,
					step: 'TRANSCRIBING',
				},
			})
			if (step2.count !== 1) return
		}

		// Step 2: transcript (skip if already present)
		let transcript = draft.transcript
		let callerTranscriptForMetadata: string | null = null
		let responderTranscriptForMetadata: string | null = null
		if (!transcript) {
			const stepTranscribe = await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: { step: 'TRANSCRIBING', errorMessage: null },
			})
			if (stepTranscribe.count !== 1) return
			const callerName = draft.call.isAnonymous
				? undefined
				: draft.call.user.firstName
			const callTitle = draft.call.title
			const callerNotes = draft.call.notes ?? undefined

			if (!segmentMp3s && responseBase64) {
				// If the draft already has episode audio but we still have the raw response
				// audio (this run), generate normalized caller/response segments so we can
				// transcribe those instead of the full stitched episode.
				const responseAudio = parseBase64DataUrl(responseBase64).buffer
				const created = await createEpisodeAudio(callAudio, responseAudio)
				segmentMp3s = {
					callerMp3: created.callerMp3,
					responseMp3: created.responseMp3,
				}
			}

			if (segmentMp3s) {
				const [callerTranscript, kentTranscript] = await Promise.all([
					transcribeMp3WithWorkersAi({
						mp3: segmentMp3s.callerMp3,
						callerName,
						callTitle,
						callerNotes,
					}),
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
			transcript = transcript.trim()
			if (!transcript) {
				throw new Error(
					'Workers AI transcription returned an empty transcript.',
				)
			}

			const step3 = await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: { transcript, step: 'GENERATING_METADATA' },
			})
			if (step3.count !== 1) return
		}

		// Step 3: AI metadata (title/description/keywords) if not already present
		if (!draft.title || !draft.description || !draft.keywords) {
			const stepMetadata = await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: { step: 'GENERATING_METADATA', errorMessage: null },
			})
			if (stepMetadata.count !== 1) return

			const metadata = await generateCallKentEpisodeMetadataWithWorkersAi({
				// Prefer segment transcripts (caller + Kent) for metadata when available.
				...(callerTranscriptForMetadata && responderTranscriptForMetadata
					? {
							callerTranscript: callerTranscriptForMetadata,
							responderTranscript: responderTranscriptForMetadata,
						}
					: { transcript }),
				callTitle: draft.call.title,
				callerNotes: draft.call.notes,
			})

			const existingTitle = draft.title?.trim()
			const existingDescription = draft.description?.trim()
			const existingKeywords = draft.keywords?.trim()
			const nextTitle = existingTitle || metadata.title.trim()
			const nextDescription = existingDescription || metadata.description.trim()
			const nextKeywords = existingKeywords || metadata.keywords.trim()

			await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: {
					title: nextTitle,
					description: nextDescription,
					keywords: nextKeywords,
					status: 'READY',
					step: 'DONE',
				},
			})
		} else {
			await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: { status: 'READY', step: 'DONE' },
			})
		}
	} catch (error: unknown) {
		const message = getErrorMessage(error)
		// Only record the error if the draft still exists and is in progress.
		await prisma.callKentEpisodeDraft.updateMany({
			where: { id: draftId, status: 'PROCESSING' },
			data: { status: 'ERROR', errorMessage: message, step: 'DONE' },
		})
	}
}
