import { prisma } from '#app/utils/prisma.server.ts'
import {
	getAudioBuffer,
	parseBase64DataUrl,
	putEpisodeDraftAudioFromBuffer,
} from '#app/utils/call-kent-audio-storage.server.ts'

function mp3DataUrlToBuffer(mp3DataUrl: string) {
	const [, b64] = mp3DataUrl.split(',', 2)
	if (!b64) {
		throw new Error('Invalid mp3 data URL')
	}
	return Buffer.from(b64, 'base64')
}

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
			callAudio = parseBase64DataUrl(draft.call.base64).buffer
		}
		if (!callAudio) {
			throw new Error('Call audio is missing (no R2 key and no legacy base64).')
		}

		// Step 1: episode audio (stitch + persist) if needed
		let episodeMp3: Buffer
		if (draft.episodeAudioKey) {
			episodeMp3 = await getAudioBuffer({ key: draft.episodeAudioKey })
		} else if (draft.episodeBase64) {
			episodeMp3 = mp3DataUrlToBuffer(draft.episodeBase64)

			// Opportunistically migrate legacy episodeBase64 into R2 storage.
			const stored = await putEpisodeDraftAudioFromBuffer({ draftId, mp3: episodeMp3 })
			await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING', episodeAudioKey: null },
				data: {
					episodeAudioKey: stored.key,
					episodeAudioContentType: stored.contentType,
					episodeAudioSize: stored.size,
					episodeBase64: null,
				},
			})
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
					episodeBase64: null,
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
			transcript = await transcribeMp3WithWorkersAi({ mp3: episodeMp3 })

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

			await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: {
					title: draft.title ?? metadata.title,
					description: draft.description ?? metadata.description,
					keywords: draft.keywords ?? metadata.keywords,
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

