import { type CallKentEpisode } from '#app/types.ts'

const callKentFieldConstraints = {
	title: { minLength: 5, maxLength: 80 },
	// Optional caller-provided context; not required for submission.
	notes: { maxLength: 5000 },
} as const

function getErrorForTitle(title: string | null) {
	if (!title) return `Title is required`

	const { minLength, maxLength } = callKentFieldConstraints.title
	if (title.length < minLength) {
		return `Title must be at least ${minLength} characters`
	}
	if (title.length > maxLength) {
		return `Title must be no longer than ${maxLength} characters`
	}
	return null
}

function getErrorForNotes(notes: string | null) {
	if (!notes) return null
	// Treat whitespace-only notes as empty, but validate length on the raw value
	// so validation matches `maxLength` + `CharacterCountdown` behavior.
	if (!notes.trim()) return null
	const { maxLength } = callKentFieldConstraints.notes
	if (notes.length > maxLength) {
		return `Notes must be no longer than ${maxLength} characters`
	}
	return null
}

function getErrorForAudio(audio: string | File | null) {
	if (!audio) return 'Audio file is required'
	if (audio instanceof File && audio.size <= 0) return 'Audio file is required'
	return null
}

export type Params = {
	season: string
	episode: string
	slug?: string
}

function getEpisodeFromParams(
	episodes: Array<CallKentEpisode>,
	params: Params,
) {
	return episodes.find(
		(e) =>
			e.seasonNumber === Number(params.season) &&
			e.episodeNumber === Number(params.episode),
	)
}

function getEpisodePath({
	seasonNumber,
	episodeNumber,
	slug,
}: {
	seasonNumber: number
	episodeNumber: number
	slug?: string
}) {
	return [
		'/calls',
		seasonNumber.toString().padStart(2, '0'),
		episodeNumber.toString().padStart(2, '0'),
		slug,
	]
		.filter(Boolean)
		.join('/')
}

export {
	callKentFieldConstraints,
	getEpisodePath,
	getEpisodeFromParams,
	getErrorForAudio,
	getErrorForTitle,
	getErrorForNotes,
}
