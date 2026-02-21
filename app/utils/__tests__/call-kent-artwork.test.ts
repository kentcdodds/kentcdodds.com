import { describe, expect, test } from 'vitest'
import { getCallKentEpisodeArtworkUrl } from '../call-kent-artwork.ts'

describe('getCallKentEpisodeArtworkUrl', () => {
	test('double-encodes title and uses size vars', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Hello world',
			url: 'kentcdodds.com/calls/01/01',
			name: '- Alice',
			avatar: { kind: 'fetch', url: 'https://example.com/avatar.png' },
			avatarIsRound: true,
			size: 900,
		})

		expect(url).toContain('$th_900,$tw_900')
		// "Hello world" => "Hello%20world" => "Hello%2520world"
		expect(url).toContain('Hello%2520world')
	})

	test('adds r_max when avatarIsRound is true', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: { kind: 'fetch', url: 'https://example.com/avatar.png' },
			avatarIsRound: true,
		})
		expect(url).toContain('c_crop,r_max')
	})

	test('omits r_max when avatarIsRound is false', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: { kind: 'fetch', url: 'https://example.com/avatar.png' },
			avatarIsRound: false,
		})
		expect(url).toContain('c_crop,g_north_west')
		expect(url).not.toContain('r_max')
	})

	test('encodes fetch avatar URL into l_fetch', () => {
		const fetchUrl = 'https://example.com/avatar.png'
		const expectedBase64 = Buffer.from(fetchUrl).toString('base64')
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: { kind: 'fetch', url: fetchUrl },
			avatarIsRound: false,
		})
		expect(url).toContain(`l_fetch:${encodeURIComponent(expectedBase64)}`)
	})

	test('uses publicId overlays without l_fetch', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: {
				kind: 'public',
				publicId: 'kentcdodds.com/illustrations/kody/kody_profile_gray',
			},
			avatarIsRound: false,
		})
		expect(url).toContain('l_kentcdodds.com:illustrations:kody:kody_profile_gray')
		expect(url).not.toContain('l_fetch:')
	})
})

