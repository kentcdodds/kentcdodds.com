import { images } from '#app/images.tsx'
import { getOptionalTeam } from './misc.ts'

export type CallKentEpisodeArtworkAvatar =
	| { kind: 'fetch'; url: string }
	| { kind: 'public'; publicId: string }

const KODY_PROFILE_BY_TEAM = {
	RED: images.kodyProfileRed,
	BLUE: images.kodyProfileBlue,
	YELLOW: images.kodyProfileYellow,
	UNKNOWN: images.kodyProfileGray,
} as const

export function getCallKentEpisodeArtworkAvatar({
	isAnonymous,
	team,
	gravatarUrl,
}: {
	isAnonymous: boolean
	team: string
	gravatarUrl?: string | null
}): CallKentEpisodeArtworkAvatar {
	if (isAnonymous) {
		return { kind: 'public', publicId: images.kodyProfileGray.id }
	}

	if (gravatarUrl) {
		return { kind: 'fetch', url: gravatarUrl }
	}

	const teamKey = getOptionalTeam(team)
	return {
		kind: 'public',
		publicId: KODY_PROFILE_BY_TEAM[teamKey].id,
	}
}
