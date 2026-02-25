import { expect, test } from 'vitest'
import {
	chunkTranscriptEvents,
	type TranscriptEvent,
} from '../youtube-transcript-chunking.ts'

test('chunkTranscriptEvents merges tiny trailing chunks into previous chunk', () => {
	const events: Array<TranscriptEvent> = [
		{ startMs: 0, durationMs: 1000, text: 'A'.repeat(40) },
		{ startMs: 1200, durationMs: 600, text: 'tail' },
	]

	const chunks = chunkTranscriptEvents(events, {
		targetChars: 40,
		maxChunkChars: 80,
		minChunkChars: 20,
	})

	expect(chunks).toHaveLength(1)
	expect(chunks[0]?.body).toContain('A'.repeat(40))
	expect(chunks[0]?.body).toContain('tail')
	expect(chunks[0]?.startMs).toBe(0)
	expect(chunks[0]?.endMs).toBe(1800)
})

test('chunkTranscriptEvents keeps a tiny chunk when it is the only chunk', () => {
	const events: Array<TranscriptEvent> = [
		{ startMs: 0, durationMs: 400, text: 'short' },
	]

	const chunks = chunkTranscriptEvents(events, {
		targetChars: 40,
		maxChunkChars: 80,
		minChunkChars: 20,
	})

	expect(chunks).toHaveLength(1)
	expect(chunks[0]?.body).toBe('short')
})

test('chunkTranscriptEvents keeps trailing chunks that meet minimum size', () => {
	const events: Array<TranscriptEvent> = [
		{ startMs: 0, durationMs: 800, text: 'A'.repeat(40) },
		{ startMs: 1000, durationMs: 700, text: 'B'.repeat(25) },
	]

	const chunks = chunkTranscriptEvents(events, {
		targetChars: 40,
		maxChunkChars: 80,
		minChunkChars: 20,
	})

	expect(chunks).toHaveLength(2)
	expect(chunks[0]?.body).toBe('A'.repeat(40))
	expect(chunks[1]?.body).toBe('B'.repeat(25))
})
