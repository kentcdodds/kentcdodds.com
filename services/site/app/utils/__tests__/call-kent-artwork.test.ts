import { describe, expect, test } from 'vitest'
import { getCallKentEpisodeArtworkAvatar } from '../call-kent-artwork.ts'
import { getCallKentEpisodeArtworkUrl } from '../call-kent-artwork.server.ts'

const secret = 'test-secret'

describe('getCallKentEpisodeArtworkUrl', () => {
	test('returns signed og-image URL with episode template', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Hello world',
			url: 'kentcdodds.com/calls/01/01',
			name: '- Alice',
			avatar: { kind: 'fetch', url: 'https://example.com/avatar.png' },
			avatarIsRound: true,
			size: 900,
			origin: 'https://kentcdodds.com',
			secret,
		})

		expect(url).toContain('/resources/og-image?')
		expect(url).toContain('tpl=call-kent-episode-art')
		expect(url).toContain('sig=')
	})

	test('maps public avatars to media kind', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: {
				kind: 'public',
				publicId: 'kentcdodds.com/illustrations/kody/kody_profile_gray',
			},
			avatarIsRound: false,
			secret,
		})
		expect(url).toContain('call-kent-episode-art')
	})
})

describe('getCallKentEpisodeArtworkAvatar', () => {
	test('uses kody for anonymous callers', () => {
		const avatar = getCallKentEpisodeArtworkAvatar({
			isAnonymous: true,
			team: 'BLUE',
		})
		expect(avatar).toEqual({
			kind: 'public',
			publicId: 'kentcdodds.com/illustrations/kody/kody_profile_gray',
		})
	})
})
