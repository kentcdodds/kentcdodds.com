import { describe, expect, test } from 'vitest'
import { getCallKentEpisodeArtworkUrl } from '../call-kent-artwork.ts'

describe('getCallKentEpisodeArtworkUrl', () => {
	test('double-encodes title and uses size vars', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Hello world',
			url: 'kentcdodds.com/calls/01/01',
			name: '- Alice',
			avatarUrl: 'https://example.com/avatar.png',
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
			avatarUrl: 'https://example.com/avatar.png',
			avatarIsRound: true,
		})
		expect(url).toContain('c_crop,r_max')
	})

	test('omits r_max when avatarIsRound is false', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatarUrl: 'https://example.com/avatar.png',
			avatarIsRound: false,
		})
		expect(url).toContain('c_crop,g_north_west')
		expect(url).not.toContain('r_max')
	})

	test('encodes avatarUrl into l_fetch', () => {
		const avatarUrl = 'https://example.com/avatar.png'
		const expectedBase64 = Buffer.from(avatarUrl).toString('base64')
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatarUrl,
			avatarIsRound: false,
		})
		expect(url).toContain(`l_fetch:${encodeURIComponent(expectedBase64)}`)
	})
})

