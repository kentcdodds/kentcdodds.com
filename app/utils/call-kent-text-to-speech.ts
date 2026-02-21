export const callKentTextToSpeechConstraints = {
	questionText: {
		minLength: 20,
		// Roughly sized so most questions land under ~2 minutes.
		maxLength: 2000,
	},
	// UI and submission safety limit; actual audio length depends on voice and pacing.
	maxAudioDurationSeconds: 120,
} as const

const auraSpeakers = [
	'angus',
	'asteria',
	'arcas',
	'orion',
	'orpheus',
	'athena',
	'luna',
	'zeus',
	'perseus',
	'helios',
	'hera',
	'stella',
] as const

export type CallKentTextToSpeechVoice = (typeof auraSpeakers)[number]

export const callKentTextToSpeechVoices: Array<{
	id: CallKentTextToSpeechVoice
	label: string
}> = [
	{ id: 'asteria', label: 'Asteria' },
	{ id: 'orion', label: 'Orion' },
	{ id: 'athena', label: 'Athena' },
	{ id: 'angus', label: 'Angus' },
]

export function isCallKentTextToSpeechVoice(
	voice: string,
): voice is CallKentTextToSpeechVoice {
	return (auraSpeakers as readonly string[]).includes(voice)
}

export function getErrorForCallKentQuestionText(value: string | null) {
	if (!value) return 'Question text is required'
	const text = value.trim()
	if (!text) return 'Question text is required'

	const { minLength, maxLength } = callKentTextToSpeechConstraints.questionText
	if (text.length < minLength) {
		return `Question text must be at least ${minLength} characters`
	}
	if (text.length > maxLength) {
		return `Question text must be no longer than ${maxLength} characters`
	}
	return null
}

export function getSuggestedCallTitleFromQuestionText(text: string) {
	const cleaned = text.replace(/\s+/g, ' ').trim()
	if (!cleaned) return ''

	const withoutGreeting = cleaned.replace(
		/^((hi|hey|hello)\s+kent[!,]?\s+)/i,
		'',
	)
	const base = (withoutGreeting || cleaned).trim()
	if (!base) return ''

	// Prefer the first sentence-ish chunk.
	const punctuationIndex = base.search(/[?.!]/)
	let candidate =
		punctuationIndex === -1 ? base : base.slice(0, punctuationIndex + 1)
	candidate = candidate.replace(/[?.!]+$/, '').trim()
	if (!candidate) return ''

	const maxLen = 80
	if (candidate.length > maxLen) {
		candidate = `${candidate.slice(0, maxLen - 3).trimEnd()}...`
	}
	// Recording form requires at least 5 chars.
	if (candidate.length < 5) return 'Call Kent question'
	return candidate
}

