import { expect, test } from 'vitest'
import { formatCallKentTranscriptWithWorkersAi } from '#app/utils/cloudflare-ai-call-kent-transcript-format.server.ts'

test('formatCallKentTranscriptWithWorkersAi returns paragraphs and preserves separators', async () => {
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

