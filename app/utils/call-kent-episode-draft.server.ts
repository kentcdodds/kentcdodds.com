import {
	getAudioBuffer,
	parseBase64DataUrl,
	putCallAudioFromBuffer,
	putEpisodeDraftAudioFromBuffer,
} from '#app/utils/call-kent-audio-storage.server.ts'
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
						audioKey: true,
						base64: true, // legacy fallback (pre-R2)
					},
				},
			},
		})
		if (!draft) return
		if (draft.status !== 'PROCESSING') return

		const [
			{ createEpisodeAudio },
			{ transcribeMp3WithWorkersAi, isCloudflareTranscriptionConfigured },
			{ generateCallKentEpisodeMetadataWithWorkersAi },
		] = await Promise.all([
			import('#app/utils/ffmpeg.server.ts'),
			import('#app/utils/cloudflare-ai-transcription.server.ts'),
			import('#app/utils/cloudflare-ai-call-kent-metadata.server.ts'),
		])

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
			episodeMp3 = await createEpisodeAudio(callAudio, responseAudio)
			const stored = await putEpisodeDraftAudioFromBuffer({ draftId, mp3: episodeMp3 })

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
		if (!transcript) {
			const stepTranscribe = await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: { step: 'TRANSCRIBING', errorMessage: null },
			})
			if (stepTranscribe.count !== 1) return

			if (!isCloudflareTranscriptionConfigured()) {
				throw new Error(
					'Cloudflare transcription is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_AI_TRANSCRIPTION_MODEL.',
				)
			}
			transcript = (await transcribeMp3WithWorkersAi({ mp3: episodeMp3 })).trim()
			if (!transcript) {
				throw new Error('Workers AI transcription returned an empty transcript.')
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
				transcript,
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
		const { getErrorMessage } = await import('#app/utils/misc.ts')
		const message = getErrorMessage(error)
		// Only record the error if the draft still exists and is in progress.
		await prisma.callKentEpisodeDraft.updateMany({
			where: { id: draftId, status: 'PROCESSING' },
			data: { status: 'ERROR', errorMessage: message, step: 'DONE' },
		})
	}
}

