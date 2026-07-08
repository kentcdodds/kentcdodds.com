import { and, eq, ne } from '@remix-run/data-table'
import { getAudioBuffer } from '#app/utils/call-kent-audio-storage.server.ts'
import { formatCallKentTranscriptWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts'
import { transcribeMp3WithWorkersAi } from '#app/utils/cloudflare-ai-transcription.server.ts'
import { db } from '#app/utils/db.server.ts'
import {
	callTable,
	callUser,
} from '#app/utils/db/schema.server.ts'
import { getErrorMessage } from '#app/utils/misc.ts'

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeCallerTranscriptForEpisode({
	callerTranscript,
	callerName,
}: {
	callerTranscript?: string | null
	callerName?: string
}) {
	const trimmed = callerTranscript?.trim()
	if (!trimmed) return null

	const labels = [callerName?.trim(), 'Caller'].filter(
		(label): label is string => Boolean(label),
	)
	for (const label of labels) {
		const labelRegex = new RegExp(`^${escapeRegExp(label)}:\\s*`, 'i')
		if (labelRegex.test(trimmed)) {
			return trimmed.replace(labelRegex, '').trim()
		}
	}

	return trimmed
}

export async function startCallKentCallerTranscriptProcessing(
	callId: string,
	{ force = false }: { force?: boolean } = {},
) {
	try {
		const started = await db.updateMany(
			callTable,
			{
				callerTranscriptStatus: 'PROCESSING',
				callerTranscriptErrorMessage: null,
			},
			{
				where: force
					? { id: callId }
					: and(eq('id', callId), ne('callerTranscriptStatus', 'PROCESSING')),
			},
		)
		if (started.affectedRows !== 1) return

		const call = await db.findOne(callTable, {
			where: { id: callId },
			with: { user: callUser },
		})
		if (!call) {
			throw new Error('Call not found.')
		}
		if (!call.audioKey) {
			throw new Error('Caller audio is missing (audioKey is null).')
		}
		if (!call.user) {
			throw new Error('Call user not found.')
		}

		const callerAudio = await getAudioBuffer({ key: call.audioKey })
		const callerName = call.isAnonymous ? undefined : call.user.firstName
		const rawTranscript = (
			await transcribeMp3WithWorkersAi({
				mp3: callerAudio,
				callerName,
				callTitle: call.title,
				callerNotes: call.notes ?? undefined,
			})
		).trim()
		if (!rawTranscript) {
			throw new Error('Workers AI transcription returned an empty transcript.')
		}

		const transcript = (
			await formatCallKentTranscriptWithWorkersAi({
				transcript: `${callerName ?? 'Caller'}: ${rawTranscript}`,
				callTitle: call.title,
				callerNotes: call.notes,
				callerName,
			}).catch((error: unknown) => {
				console.error(
					'Caller transcript formatting failed; using unformatted transcript.',
					{ callId, error: getErrorMessage(error) },
				)
				return `${callerName ?? 'Caller'}: ${rawTranscript}`
			})
		).trim()
		if (!transcript) {
			throw new Error(
				'Caller transcript formatting returned an empty transcript.',
			)
		}

		await db.updateMany(
			callTable,
			{
				callerTranscript: transcript,
				callerTranscriptStatus: 'READY',
				callerTranscriptErrorMessage: null,
			},
			{ where: { id: callId, callerTranscriptStatus: 'PROCESSING' } },
		)
	} catch (error: unknown) {
		await db.updateMany(
			callTable,
			{
				callerTranscriptStatus: 'ERROR',
				callerTranscriptErrorMessage: getErrorMessage(error),
			},
			{ where: { id: callId, callerTranscriptStatus: 'PROCESSING' } },
		)
	}
}
