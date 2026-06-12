import { expect, test, vi } from 'vitest'

vi.mock('../cache.server.ts', () => ({
	cache: {},
	cachified: async ({
		getFreshValue,
	}: {
		getFreshValue: (context: {}) => unknown
	}) => await getFreshValue({}),
}))

import { parseYouTubePlaylistFeed } from '../better-with-kent.server.ts'

const sampleFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Better with Kent</title>
 <entry>
  <id>yt:video:c1w-Y4IRZFw</id>
  <yt:videoId>c1w-Y4IRZFw</yt:videoId>
  <title>What Software Engineers Need in 2026</title>
  <published>2026-05-29T19:32:28+00:00</published>
  <media:group>
   <media:title>What Software Engineers Need in 2026</media:title>
   <media:description>Kent maps the durable skills &amp; habits that stay valuable.

Chapters
0:00 Intro</media:description>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:XYhLG7a5Qp0</id>
  <yt:videoId>XYhLG7a5Qp0</yt:videoId>
  <title>How to Prioritize Software Tasks</title>
  <published>2026-06-03T08:29:53+00:00</published>
  <media:group>
   <media:title>How to Prioritize Software Tasks</media:title>
   <media:description>Kent walks the Kano model on a real backlog.</media:description>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:badentry0000</id>
  <title>Entry without a video id is skipped</title>
  <published>2026-06-01T00:00:00+00:00</published>
 </entry>
</feed>`

test('parseYouTubePlaylistFeed extracts episodes newest-first', () => {
	const episodes = parseYouTubePlaylistFeed(sampleFeed)

	expect(episodes).toEqual([
		{
			videoId: 'XYhLG7a5Qp0',
			title: 'How to Prioritize Software Tasks',
			description: 'Kent walks the Kano model on a real backlog.',
			publishedAt: '2026-06-03T08:29:53+00:00',
		},
		{
			videoId: 'c1w-Y4IRZFw',
			title: 'What Software Engineers Need in 2026',
			description: 'Kent maps the durable skills & habits that stay valuable.',
			publishedAt: '2026-05-29T19:32:28+00:00',
		},
	])
})

test('parseYouTubePlaylistFeed returns an empty array for non-feed content', () => {
	expect(parseYouTubePlaylistFeed('<html>not a feed</html>')).toEqual([])
})
