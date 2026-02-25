import { normalizeText } from './chunk-utils.ts'

export type TranscriptEvent = {
	startMs: number
	durationMs: number
	text: string
}

export type TranscriptChunk = {
	body: string
	startMs: number
	endMs: number
}

function mergeTinyTrailingChunks({
	chunks,
	minChunkChars,
}: {
	chunks: Array<TranscriptChunk>
	minChunkChars: number
}) {
	if (minChunkChars <= 0) return chunks

	// Tiny tail chunks can become noisy semantic "hubs". Merge them backward so
	// we retain context/timestamps without indexing ultra-small standalone chunks.
	let tailIndex = chunks.length - 1
	while (tailIndex > 0) {
		const tail = chunks[tailIndex]
		if (!tail || tail.body.length >= minChunkChars) break

		const previous = chunks[tailIndex - 1]
		if (!previous) break

		chunks[tailIndex - 1] = {
			body: normalizeText(`${previous.body}\n${tail.body}`),
			startMs: previous.startMs,
			endMs: Math.max(previous.endMs, tail.endMs),
		}
		chunks.splice(tailIndex, 1)
		tailIndex--
	}

	return chunks
}

export function chunkTranscriptEvents(
	events: Array<TranscriptEvent>,
	{
		targetChars = 3500,
		maxChunkChars = 5500,
		minChunkChars = 200,
	}: { targetChars?: number; maxChunkChars?: number; minChunkChars?: number } = {},
) {
	const safeTargetChars = Math.max(
		1,
		Number.isFinite(targetChars) ? Math.floor(targetChars) : 3500,
	)
	const safeMaxChunkChars = Math.max(
		safeTargetChars,
		Number.isFinite(maxChunkChars) ? Math.floor(maxChunkChars) : 5500,
	)
	const safeMinChunkChars = Math.min(
		safeMaxChunkChars,
		Math.max(0, Number.isFinite(minChunkChars) ? Math.floor(minChunkChars) : 200),
	)

	const sorted = [...events].sort((a, b) => a.startMs - b.startMs)
	const chunks: Array<TranscriptChunk> = []

	let currentLines: string[] = []
	let currentLen = 0
	let startMs: number | null = null
	let endMs = 0

	const flush = () => {
		if (!currentLines.length || startMs === null) return
		const body = normalizeText(currentLines.join('\n'))
		if (!body) return
		chunks.push({ body, startMs, endMs })
		currentLines = []
		currentLen = 0
		startMs = null
		endMs = 0
	}

	const splitOversizedLine = (line: string, event: TranscriptEvent) => {
		if (currentLines.length || line.length <= safeMaxChunkChars) return false

		const eventStartMs = Math.max(0, Math.floor(event.startMs))
		const eventEndMs = Math.max(
			eventStartMs,
			Math.floor(event.startMs + (event.durationMs || 0)),
		)

		for (let i = 0; i < line.length; i += safeTargetChars) {
			const part = line.slice(i, i + safeTargetChars)
			const body = normalizeText(part)
			if (!body) continue
			chunks.push({ body, startMs: eventStartMs, endMs: eventEndMs })
		}

		return true
	}

	for (const e of sorted) {
		const line = normalizeText(e.text)
		if (!line) continue

		// If we don't have a current chunk and this line is huge, split it.
		if (splitOversizedLine(line, e)) continue

		const nextLen = currentLen + (currentLines.length ? 1 : 0) + line.length
		if (currentLines.length && nextLen > safeTargetChars) {
			flush()
		}
		if (splitOversizedLine(line, e)) continue

		if (startMs === null) startMs = Math.max(0, Math.floor(e.startMs))
		const eventEnd = Math.max(0, Math.floor(e.startMs + (e.durationMs || 0)))
		endMs = Math.max(endMs, eventEnd)
		currentLines.push(line)
		currentLen = currentLen + (currentLines.length > 1 ? 1 : 0) + line.length
	}

	flush()
	return mergeTinyTrailingChunks({ chunks, minChunkChars: safeMinChunkChars })
}
