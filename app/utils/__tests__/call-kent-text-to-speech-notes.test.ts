import { expect, test } from 'vitest'
import {
	AI_VOICE_DISCLOSURE_PREFIX,
	formatCallKentTextToSpeechNotes,
} from '../call-kent-text-to-speech.ts'

test('formats typed-question notes with AI disclosure prefix', () => {
	const notes = formatCallKentTextToSpeechNotes('  Hello from a typed call.  ')
	expect(notes).toBe(
		`${AI_VOICE_DISCLOSURE_PREFIX}\nTyped question: Hello from a typed call.`,
	)
})

test('preserves internal newlines in typed question', () => {
	const question = 'First line\nSecond line'
	const notes = formatCallKentTextToSpeechNotes(question)
	expect(notes).toBe(
		`${AI_VOICE_DISCLOSURE_PREFIX}\nTyped question: ${question}`,
	)
})

test('removes duplicate AI disclosure from typed question', () => {
	const question = `${AI_VOICE_DISCLOSURE_PREFIX} Hello from a typed call.`
	const notes = formatCallKentTextToSpeechNotes(question)
	expect(notes).toBe(
		`${AI_VOICE_DISCLOSURE_PREFIX}\nTyped question: Hello from a typed call.`,
	)
})
