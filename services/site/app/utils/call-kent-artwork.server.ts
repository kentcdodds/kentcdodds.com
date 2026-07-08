import { buildOgImageUrl } from '#app/og/url.server.ts'
import { type CallKentEpisodeArtworkAvatar } from './call-kent-artwork.ts'

type CallKentEpisodeArtworkOptions = {
	title: string
	url: string
	name: string
	avatar: CallKentEpisodeArtworkAvatar
	avatarIsRound: boolean
	size?: number
	origin?: string
	secret: string
}

export function getCallKentEpisodeArtworkUrl({
	title,
	url,
	name,
	avatar,
	avatarIsRound,
	size = 1400,
	origin = 'https://kentcdodds.com',
	secret,
}: CallKentEpisodeArtworkOptions) {
	return buildOgImageUrl(
		origin,
		'call-kent-episode-art',
		{
			title,
			url,
			name,
			avatarKind: avatar.kind === 'public' ? 'media' : 'fetch',
			avatarSource: avatar.kind === 'public' ? avatar.publicId : avatar.url,
			avatarIsRound,
			size,
		},
		secret,
	)
}
