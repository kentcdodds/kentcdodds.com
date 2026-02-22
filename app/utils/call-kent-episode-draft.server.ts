import { prisma } from '#app/utils/prisma.server.ts'

function bufferToMp3DataUrl(buffer: Buffer) {
	// Consistent with existing call recordings, which are stored as data URLs.
	return `data:audio/mpeg;base64,${buffer.toString('base64')}`
}

export async function startCallKentEpisodeDraftProcessing(draftId: string) {
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
						base64: true,
						user: { select: { id: true } },
					},
				},
			},
		})
		if (!draft) return
		if (draft.status !== 'PROCESSING') return

		// Step 1: stitch mp3 audio
		const step1 = await prisma.callKentEpisodeDraft.updateMany({
			where: { id: draftId, status: 'PROCESSING' },
			data: { step: 'GENERATING_AUDIO', errorMessage: null },
		})
		if (step1.count !== 1) return

		const [{ createEpisodeAudio }, { transcribeMp3WithWorkersAi, isCloudflareTranscriptionConfigured }, { generateCallKentEpisodeMetadataWithWorkersAi }] =
			await Promise.all([
				import('#app/utils/ffmpeg.server.ts'),
				import('#app/utils/cloudflare-ai-transcription.server.ts'),
				import('#app/utils/cloudflare-ai-call-kent-metadata.server.ts'),
			])

		const stitchedMp3 = await createEpisodeAudio(
			draft.call.base64,
			draft.responseBase64,
		)
		const episodeBase64 = bufferToMp3DataUrl(stitchedMp3)

		const step2 = await prisma.callKentEpisodeDraft.updateMany({
			where: { id: draftId, status: 'PROCESSING' },
			data: { episodeBase64, step: 'TRANSCRIBING' },
		})
		if (step2.count !== 1) return

		// Step 2: transcript
		if (!isCloudflareTranscriptionConfigured()) {
			throw new Error(
				'Cloudflare transcription is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_AI_TRANSCRIPTION_MODEL.',
			)
		}
		const transcript = await transcribeMp3WithWorkersAi({ mp3: stitchedMp3 })

		const step3 = await prisma.callKentEpisodeDraft.updateMany({
			where: { id: draftId, status: 'PROCESSING' },
			data: { transcript, step: 'GENERATING_METADATA' },
		})
		if (step3.count !== 1) return

		// Step 3: AI metadata (title/description/keywords)
		const metadata = await generateCallKentEpisodeMetadataWithWorkersAi({
			transcript,
			callTitle: draft.call.title,
			callerNotes: draft.call.notes,
		})

		await prisma.callKentEpisodeDraft.updateMany({
			where: { id: draftId, status: 'PROCESSING' },
			data: {
				title: metadata.title,
				description: metadata.description,
				keywords: metadata.keywords,
				status: 'READY',
				step: 'DONE',
			},
		})
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

