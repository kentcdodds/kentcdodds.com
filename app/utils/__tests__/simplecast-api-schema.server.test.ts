import { expect, test } from 'vitest'
import {
	simplecastEpisodeSchema,
	simplecastEpisodesListResponseSchema,
	simplecastSeasonsResponseSchema,
} from '../simplecast-api-schema.server.ts'

test('simplecastSeasonsResponseSchema parses collection items we use', () => {
	const parsed = simplecastSeasonsResponseSchema.parse({
		collection: [
			{ href: 'https://api.simplecast.com/seasons/abc123', number: 7, extra: 1 },
		],
		ignoredTopLevel: true,
	})

	expect(parsed.collection).toHaveLength(1)
	expect(parsed.collection[0]).toEqual({
		href: 'https://api.simplecast.com/seasons/abc123',
		number: 7,
	})
})

test('simplecastEpisodesListResponseSchema parses episode list items we use', () => {
	const parsed = simplecastEpisodesListResponseSchema.parse({
		collection: [
			{
				id: 'ep_1',
				status: 'published',
				is_hidden: false,
				extra: 'ignored',
			},
		],
	})

	expect(parsed.collection[0]).toEqual({
		id: 'ep_1',
		status: 'published',
		is_hidden: false,
	})
})

test('simplecastEpisodeSchema allows optional/nullable fields we handle', () => {
	const parsed = simplecastEpisodeSchema.parse({
		id: 'ep_1',
		is_published: true,
		published_at: null,
		updated_at: '2026-02-23T00:00:00.000Z',
		slug: 'episode-slug',
		transcription: null,
		long_description: null,
		// description is optional and may be null
		description: null,
		image_url: 'https://example.com/image.png',
		number: 1,
		duration: 1234,
		title: 'Episode title',
		season: { number: 2, extra: 'ignored' },
		keywords: { collection: [{ value: 'react', extra: true }] },
		enclosure_url: 'https://cdn.simplecast.com/audio/ep_1.mp3',
		extra: { ignored: true },
	})

	expect(parsed.season.number).toBe(2)
	expect(parsed.keywords?.collection.map((k) => k.value)).toEqual(['react'])
})

