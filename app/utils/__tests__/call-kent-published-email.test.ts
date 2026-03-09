import { expect, test } from 'vitest'
import { getPublishedCallKentEpisodeEmail } from '../call-kent-published-email.ts'

test('includes the published episode link and artwork image in the email', () => {
	const email = getPublishedCallKentEpisodeEmail({
		firstName: 'Ada',
		episodeTitle: 'Episode 12',
		episodeUrl: 'https://kentcdodds.com/calls/12/34/episode-12',
		imageUrl: 'https://images.example.com/call-kent-art.jpg',
	})

	expect(email.text).toContain('Episode 12')
	expect(email.text).toContain('https://kentcdodds.com/calls/12/34/episode-12')
	expect(email.html).toContain('Episode 12')
	expect(email.html).toContain(
		'href="https://kentcdodds.com/calls/12/34/episode-12"',
	)
	expect(email.html).toContain('<img')
	expect(email.html).toContain('https://images.example.com/call-kent-art.jpg')
})

test('escapes user-provided content and omits artwork markup when image is missing', () => {
	const email = getPublishedCallKentEpisodeEmail({
		firstName: '<Ada & Co>',
		episodeTitle: '<Episode "12">',
		episodeUrl: 'https://kentcdodds.com/calls?x=1&y=2',
		imageUrl: null,
	})

	expect(email.html).toContain('Hi &lt;Ada &amp; Co&gt;,')
	expect(email.html).toContain('&lt;Episode &quot;12&quot;&gt;')
	expect(email.html).toContain(
		'href="https://kentcdodds.com/calls?x=1&amp;y=2"',
	)
	expect(email.html).not.toContain('<img')
})
