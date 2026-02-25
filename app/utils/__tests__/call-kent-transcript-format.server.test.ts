import { expect, test, vi } from 'vitest'
import { formatCallKentTranscriptWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts'

function installTranscriptFormatterFetchMock() {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
			const payload = JSON.parse(String(init?.body ?? '{}')) as {
				messages?: Array<{ role?: string; content?: string }>
			}
			const userMessage =
				payload.messages?.find((message) => message.role === 'user')
					?.content ?? ''
			const transcriptMatch =
				/<<<TRANSCRIPT>>>\n([\s\S]*?)\n<<<END TRANSCRIPT>>>/.exec(userMessage)
			const transcript = transcriptMatch?.[1]?.trim() ?? ''
			const formatted = transcript.replace(/([.!?])\s+/g, '$1\n\n')
			return Response.json({ result: { response: formatted } })
		}),
	)
}

test('formatCallKentTranscriptWithWorkersAi rejects empty transcripts', async () => {
	await expect(
		formatCallKentTranscriptWithWorkersAi({ transcript: '' }),
	).rejects.toThrow(/missing transcript input/i)
})

test('formatCallKentTranscriptWithWorkersAi returns paragraphs and preserves separators', async () => {
	installTranscriptFormatterFetchMock()
	const transcript = `
Announcer: You're listening to the Call Kent Podcast. Now let's hear the call.

---

Caller: Hi Kent. I have a question about loaders. I keep seeing double fetching.

---

Kent: Great question. Let's talk about it. First, loaders run on the server.

---

Announcer: This has been the Call Kent Podcast. Thanks for listening.
`.trim()

	const formatted = await formatCallKentTranscriptWithWorkersAi({ transcript })

	expect(formatted).toContain('Announcer:')
	expect(formatted).toContain('Caller:')
	expect(formatted).toContain('Kent:')

	const originalSepCount = (transcript.match(/^---$/gm) ?? []).length
	const formattedSepCount = (formatted.match(/^---$/gm) ?? []).length
	expect(formattedSepCount).toBe(originalSepCount)

	// The mock formatter inserts a blank line after sentence-ending punctuation.
	expect(formatted).toMatch(/[.!?]\n\n/)
})

test('formatCallKentTranscriptWithWorkersAi works without --- separators', async () => {
	installTranscriptFormatterFetchMock()
	const transcript = `Caller: Hi Kent. This is a single block transcript. It should still get paragraph breaks.`
	const formatted = await formatCallKentTranscriptWithWorkersAi({ transcript })
	expect(formatted).toContain('Caller:')
	expect(formatted).toMatch(/[.!?]\n\n/)
})

test('formatCallKentTranscriptWithWorkersAi does not truncate long transcripts', async () => {
	installTranscriptFormatterFetchMock()
	const longBody = Array.from(
		{ length: 600 },
		(_, i) => `Sentence ${i + 1}.`,
	).join(' ')
	const transcript = `Kent: ${longBody}`

	const formatted = await formatCallKentTranscriptWithWorkersAi({ transcript })
	expect(formatted).toContain('Kent:')
	expect(formatted).toContain('Sentence 600.')
	expect(formatted).toMatch(/[.!?]\n\n/)
})
