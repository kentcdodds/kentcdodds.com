const callKentIntroTranscript = `
You're listening to the Call Kent Podcast where Kent C. Dodds answers questions and gives insights to software engineers like you.

Now let's hear the call.
`.trim()

const callKentInterludeTranscript = `
That was the call.

Here's what Kent had to say.
`.trim()

const callKentOutroTranscript = `
This has been the Call Kent Podcast.

Learn more about Kent at kentcdodds.com and get your own questions answered at kentcdodds.com/calls.
`.trim()

function assembleCallKentTranscript({
	callerTranscript,
	kentTranscript,
	callerName,
}: {
	callerTranscript: string
	kentTranscript: string
	callerName?: string
}) {
	// Keep this in sync with `app/assets/call-kent/*.mp3` (intro/interstitial/outro).
	return `
Announcer: ${callKentIntroTranscript}

---

${callerName ?? 'Caller'}: ${callerTranscript.trim()}

---

Announcer: ${callKentInterludeTranscript}

---

Kent: ${kentTranscript.trim()}

---

Announcer: ${callKentOutroTranscript}
`.trim()
}

export {
	assembleCallKentTranscript,
	callKentInterludeTranscript,
	callKentIntroTranscript,
	callKentOutroTranscript,
}
