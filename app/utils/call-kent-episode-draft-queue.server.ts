import { startCallKentEpisodeDraftProcessing } from '#app/utils/call-kent-episode-draft.server.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'

export type CallKentEpisodeDraftQueueMessage = {
	draftId: string
	responseAudioKey: string | null
}

type QueueBindingLike<TMessage> = {
	send: (message: TMessage) => Promise<void>
}

export function getCallKentEpisodeDraftQueueBinding() {
	return getRuntimeBinding<
		QueueBindingLike<CallKentEpisodeDraftQueueMessage>
	>('CALLS_DRAFT_QUEUE')
}

export async function enqueueCallKentEpisodeDraftProcessing(
	message: CallKentEpisodeDraftQueueMessage,
) {
	const queue = getCallKentEpisodeDraftQueueBinding()
	if (!queue) return false
	await queue.send(message)
	return true
}

export async function processCallKentEpisodeDraftQueueMessage(
	message: CallKentEpisodeDraftQueueMessage,
) {
	await startCallKentEpisodeDraftProcessing(message.draftId, {
		responseAudioKey: message.responseAudioKey,
	})
}
