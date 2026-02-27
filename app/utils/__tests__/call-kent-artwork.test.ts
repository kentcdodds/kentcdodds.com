import { describe, expect, test } from 'vitest'
import { getCallKentEpisodeArtworkUrl } from '../call-kent-artwork.ts'

describe('getCallKentEpisodeArtworkUrl', () => {
	test('returns artwork endpoint with requested output size', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Hello world',
			url: 'kentcdodds.com/calls/01/01',
			name: '- Alice',
			avatar: { kind: 'fetch', url: 'https://example.com/avatar.png' },
			avatarIsRound: true,
			size: 900,
		})

		const parsed = new URL(url)
		expect(parsed.pathname).toBe('/artwork/call-kent.png')
		expect(parsed.searchParams.get('title')).toBe('Hello world')
		expect(parsed.searchParams.get('size')).toBe('900')
		expect(parsed.searchParams.get('designSize')).toBe('3000')
	})

	test('marks avatar as round when avatarIsRound is true', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: { kind: 'fetch', url: 'https://example.com/avatar.png' },
			avatarIsRound: true,
		})
		const parsed = new URL(url)
		expect(parsed.searchParams.get('avatarRound')).toBe('1')
	})

	test('marks avatar as non-round when avatarIsRound is false', () => {
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: { kind: 'fetch', url: 'https://example.com/avatar.png' },
			avatarIsRound: false,
		})
		const parsed = new URL(url)
		expect(parsed.searchParams.get('avatarRound')).toBe('0')
	})

	test('stores fetch avatar URL when avatar kind is fetch', () => {
		const fetchUrl = 'https://example.com/avatar.png'
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: { kind: 'fetch', url: fetchUrl },
			avatarIsRound: false,
		})
		const parsed = new URL(url)
		expect(parsed.searchParams.get('avatarKind')).toBe('fetch')
		expect(parsed.searchParams.get('avatar')).toBe(fetchUrl)
	})

	test('stores public avatar id when avatar kind is public', () => {
		const publicId = 'kentcdodds.com/illustrations/kody/kody_profile_gray'
		const url = getCallKentEpisodeArtworkUrl({
			title: 'Test',
			url: 'kentcdodds.com/calls/00/00',
			name: '- Alice',
			avatar: {
				kind: 'public',
				publicId,
			},
			avatarIsRound: false,
		})
		const parsed = new URL(url)
		expect(parsed.searchParams.get('avatarKind')).toBe('public')
		expect(parsed.searchParams.get('avatar')).toBe(publicId)
	})
})
