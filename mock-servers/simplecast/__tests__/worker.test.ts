import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('simplecast mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-simplecast.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('simplecast')
	})

	test('returns seasons and episode details', async () => {
		const seasonsResponse = await worker.fetch(
			new Request('http://mock-simplecast.local/podcasts/mock-podcast/seasons'),
			{},
			{},
		)
		expect(seasonsResponse.status).toBe(200)
		const seasonsPayload = (await seasonsResponse.json()) as {
			collection: Array<{ href: string; number: number }>
		}
		expect(seasonsPayload.collection.length).toBeGreaterThan(0)

		const firstSeasonId = seasonsPayload.collection[0]?.href.split('/').pop()
		expect(typeof firstSeasonId).toBe('string')

		const episodeListResponse = await worker.fetch(
			new Request(
				`http://mock-simplecast.local/seasons/${firstSeasonId}/episodes?limit=300`,
			),
			{},
			{},
		)
		expect(episodeListResponse.status).toBe(200)
		const episodeListPayload = (await episodeListResponse.json()) as {
			collection: Array<{ id: string }>
		}
		expect(episodeListPayload.collection.length).toBeGreaterThan(0)

		const firstEpisodeId = episodeListPayload.collection[0]?.id
		expect(typeof firstEpisodeId).toBe('string')

		const episodeResponse = await worker.fetch(
			new Request(`http://mock-simplecast.local/episodes/${firstEpisodeId}`),
			{},
			{},
		)
		expect(episodeResponse.status).toBe(200)
		const episodePayload = (await episodeResponse.json()) as {
			id: string
			season: { number: number }
		}
		expect(episodePayload.id).toBe(firstEpisodeId)
		expect(episodePayload.season.number).toBeGreaterThan(0)
	})
})
