import { expect, test } from 'vitest'
import {
	extractYoutubeChannelIdFromHtml,
	filterOfficeHoursVideos,
	getUploadsPlaylistIdFromChannelId,
	titleIncludesOfficeHours,
} from '../youtube-channel-helpers.ts'

test('titleIncludesOfficeHours matches titles case-insensitively', () => {
	expect(titleIncludesOfficeHours('KCD Office Hours: Testing React apps')).toBe(
		true,
	)
	expect(titleIncludesOfficeHours('office hours - debugging TypeScript')).toBe(
		true,
	)
	expect(titleIncludesOfficeHours('OFFICE HOURS Q&A')).toBe(true)
})

test('titleIncludesOfficeHours ignores non-matching titles', () => {
	expect(titleIncludesOfficeHours('Live stream Q&A')).toBe(false)
	expect(titleIncludesOfficeHours('Kent C. Dodds uploads')).toBe(false)
})

test('filterOfficeHoursVideos keeps only Office Hours uploads in order', () => {
	const filtered = filterOfficeHoursVideos([
		{ videoId: 'one', title: 'Office Hours: React' },
		{ videoId: 'two', title: 'Regular live stream' },
		{ videoId: 'three', title: 'office hours - accessibility' },
	])

	expect(filtered).toEqual([
		{ videoId: 'one', title: 'Office Hours: React' },
		{ videoId: 'three', title: 'office hours - accessibility' },
	])
})

test('extractYoutubeChannelIdFromHtml prefers the channel metadata ids', () => {
	const html = `
		<html>
			<body>
				<script>
					var ytInitialData = {
						metadata: {
							channelMetadataRenderer: {
								externalId: "UC1234567890123456789012"
							}
						}
					}
				</script>
			</body>
		</html>
	`

	expect(extractYoutubeChannelIdFromHtml(html)).toBe('UC1234567890123456789012')
})

test('extractYoutubeChannelIdFromHtml falls back to browse ids', () => {
	const html = `
		<html>
			<body>
				<script>
					var ytInitialData = {
						header: {
							c4TabbedHeaderRenderer: {
								browseId: "UCabcdefghijklmnopqrstuv"
							}
						}
					}
				</script>
			</body>
		</html>
	`

	expect(extractYoutubeChannelIdFromHtml(html)).toBe('UCabcdefghijklmnopqrstuv')
})

test('getUploadsPlaylistIdFromChannelId converts channel ids to uploads playlists', () => {
	expect(getUploadsPlaylistIdFromChannelId('UC1234567890123456789012')).toBe(
		'UU1234567890123456789012',
	)
	expect(getUploadsPlaylistIdFromChannelId('not-a-channel-id')).toBeNull()
})
