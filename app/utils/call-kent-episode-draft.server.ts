import { prisma } from '#app/utils/prisma.server.ts'

function bufferToMp3DataUrl(buffer: Buffer) {
	// Consistent with existing call recordings, which are stored as data URLs.
	return `data:audio/mpeg;base64,${buffer.toString('base64')}`
}

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
						base64: true,
						user: { select: { id: true } },
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

		// Step 1: episode audio (stitch + persist) if needed
		let episodeMp3: Buffer
		if (draft.episodeBase64) {
			episodeMp3 = mp3DataUrlToBuffer(draft.episodeBase64)
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

			episodeMp3 = await createEpisodeAudio(draft.call.base64, responseBase64)
			const episodeBase64 = bufferToMp3DataUrl(episodeMp3)

			const step2 = await prisma.callKentEpisodeDraft.updateMany({
				where: { id: draftId, status: 'PROCESSING' },
				data: { episodeBase64, step: 'TRANSCRIBING' },
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

