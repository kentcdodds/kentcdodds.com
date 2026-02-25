import { describe, expect, test } from 'vitest'
import {
	getGenericSocialImage,
	getImageBuilder,
	getMediaStreamBaseUrl,
	getSocialImageWithPreTitle,
} from '#app/images.tsx'
import { getCallKentEpisodeArtworkUrl } from '#app/utils/call-kent-artwork.ts'
import worker from '../../../mock-servers/media-images/worker.ts'

describe('media service contract', () => {
	test('generated media endpoints are served by media worker', async () => {
		const originalMediaBaseUrl = process.env.MEDIA_BASE_URL
		const originalMediaStreamBaseUrl = process.env.MEDIA_STREAM_BASE_URL
		process.env.MEDIA_BASE_URL = 'http://mock-media-images.local'
		process.env.MEDIA_STREAM_BASE_URL = 'http://mock-media-images.local/stream'

		try {
			const imageUrl = getImageBuilder('sample/path.png')()
			const socialUrl = getGenericSocialImage({
				url: 'kentcdodds.com/blog/example',
				featuredImage: 'kentcdodds.com/content/blog/example/banner',
				words: 'Example words',
			})
			const preTitleUrl = getSocialImageWithPreTitle({
				url: 'kentcdodds.com/blog/example',
				featuredImage: 'kentcdodds.com/content/blog/example/banner',
				title: 'Example title',
				preTitle: 'Check this out',
			})
			const artworkUrl = getCallKentEpisodeArtworkUrl({
				title: 'Example episode',
				url: 'kentcdodds.com/calls/01/01',
				name: 'Kent C. Dodds',
				avatar: {
					kind: 'public',
					publicId: 'kent/profile-transparent',
				},
				avatarIsRound: true,
			})
			const streamUrl = `${getMediaStreamBaseUrl().replace(/\/+$/, '')}/sample.mp4`

			const responses = await Promise.all([
				worker.fetch(new Request(imageUrl)),
				worker.fetch(new Request(socialUrl)),
				worker.fetch(new Request(preTitleUrl)),
				worker.fetch(new Request(artworkUrl)),
				worker.fetch(new Request(streamUrl)),
			])

			for (const response of responses) {
				expect(response.status).toBe(200)
			}
			expect(responses[0]?.headers.get('content-type')).toBe('image/svg+xml')
			expect(responses[1]?.headers.get('content-type')).toBe('image/svg+xml')
			expect(responses[2]?.headers.get('content-type')).toBe('image/svg+xml')
			expect(responses[3]?.headers.get('content-type')).toBe('image/svg+xml')
			expect(responses[4]?.headers.get('content-type')).toBe('image/svg+xml')
		} finally {
			if (typeof originalMediaBaseUrl === 'undefined') {
				delete process.env.MEDIA_BASE_URL
			} else {
				process.env.MEDIA_BASE_URL = originalMediaBaseUrl
			}
			if (typeof originalMediaStreamBaseUrl === 'undefined') {
				delete process.env.MEDIA_STREAM_BASE_URL
			} else {
				process.env.MEDIA_STREAM_BASE_URL = originalMediaStreamBaseUrl
			}
		}
	})
})
