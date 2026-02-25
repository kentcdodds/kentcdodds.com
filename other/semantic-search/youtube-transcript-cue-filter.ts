const BARE_CUE_WORDS = new Set([
	'music',
	'applause',
	'laughter',
	'laughing',
	'cheering',
	'silence',
	'noise',
	'sigh',
	'sighs',
	'inaudible',
])

export function isLowSignalYoutubeCaptionCueLine(line: string) {
	const normalized = line.replace(/\s+/g, ' ').trim()
	if (!normalized) return true

	// Caption tracks often include non-semantic cues like `[Music]`.
	const cueOnlyBracketedPattern = /^(?:\[[^\]]+\](?:[\s.,!?;:\/\\-]*)?)+$/u
	if (cueOnlyBracketedPattern.test(normalized)) return true

	return BARE_CUE_WORDS.has(normalized.toLowerCase())
}
