import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'

const { resolveMediaVideoIdMock } = vi.hoisted(() => ({
	resolveMediaVideoIdMock: vi.fn((value: string) => value),
}))

vi.mock('#app/images.tsx', () => ({
	getMediaStreamBaseUrl: () => 'https://media.kentcdodds.com/stream',
}))

vi.mock('#app/utils/media-manifest-resolver.ts', () => ({
	resolveMediaVideoId: (value: string) => resolveMediaVideoIdMock(value),
}))

import { MediaVideo } from '../media-video.tsx'

describe('MediaVideo', () => {
	test('adds .mp4 extension for stream IDs', () => {
		resolveMediaVideoIdMock.mockReturnValue('video-stream-id')
		const html = renderToStaticMarkup(<MediaVideo imageId="content/my-video" />)
		expect(html).toContain(
			'src="https://media.kentcdodds.com/stream/video-stream-id.mp4?width=1000&amp;fit=fill"',
		)
	})

	test('preserves explicit file extensions from manifest IDs', () => {
		resolveMediaVideoIdMock.mockReturnValue('content/blog/demo/video.webm')
		const html = renderToStaticMarkup(<MediaVideo imageId="content/blog/demo/video.webm" />)
		expect(html).toContain(
			'src="https://media.kentcdodds.com/stream/content/blog/demo/video.webm?width=1000&amp;fit=fill"',
		)
	})
})
