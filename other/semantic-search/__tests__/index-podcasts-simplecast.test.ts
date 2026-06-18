import { expect, test, vi } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'
import { fetchSimplecastEpisodes } from '../index-podcasts.ts'

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), {
		headers: { 'Content-Type': 'application/json' },
		...init,
	})
}

test('fetchSimplecastEpisodes fails when an episodes list stays rate limited', async () => {
	using _ignoredEnv = setEnv({
		SIMPLECAST_KEY: 'simplecast-key',
		CHATS_WITH_KENT_PODCAST_ID: 'podcast-id',
		SIMPLECAST_MAX_RETRIES: '0',
		SIMPLECAST_BASE_DELAY_MS: '0',
		SIMPLECAST_EPISODE_DETAIL_SPACING_MS: '0',
	})
	const fetchMock = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (url) => {
			const href = String(url)
			if (href === 'https://api.simplecast.com/podcasts/podcast-id/seasons') {
				return jsonResponse({
					collection: [
						{
							href: 'https://api.simplecast.com/seasons/season-id',
							number: 1,
						},
					],
				})
			}
			if (
				href ===
				'https://api.simplecast.com/seasons/season-id/episodes?limit=300'
			) {
				return jsonResponse({ too_many_requests: true }, { status: 429 })
			}
			throw new Error(`Unexpected Simplecast URL: ${href}`)
		})

	try {
		await expect(fetchSimplecastEpisodes()).rejects.toThrow(
			'Simplecast episodes list error: 429',
		)
	} finally {
		fetchMock.mockRestore()
	}
})

test('fetchSimplecastEpisodes fails when an episode detail stays rate limited', async () => {
	using _ignoredEnv = setEnv({
		SIMPLECAST_KEY: 'simplecast-key',
		CHATS_WITH_KENT_PODCAST_ID: 'podcast-id',
		SIMPLECAST_MAX_RETRIES: '0',
		SIMPLECAST_BASE_DELAY_MS: '0',
		SIMPLECAST_EPISODE_DETAIL_SPACING_MS: '0',
	})
	const fetchMock = vi
		.spyOn(globalThis, 'fetch')
		.mockImplementation(async (url) => {
			const href = String(url)
			if (href === 'https://api.simplecast.com/podcasts/podcast-id/seasons') {
				return jsonResponse({
					collection: [
						{
							href: 'https://api.simplecast.com/seasons/season-id',
							number: 1,
						},
					],
				})
			}
			if (
				href ===
				'https://api.simplecast.com/seasons/season-id/episodes?limit=300'
			) {
				return jsonResponse({
					collection: [
						{ id: 'episode-id', status: 'published', is_hidden: false },
					],
				})
			}
			if (href === 'https://api.simplecast.com/episodes/episode-id') {
				return jsonResponse({ too_many_requests: true }, { status: 429 })
			}
			throw new Error(`Unexpected Simplecast URL: ${href}`)
		})

	try {
		await expect(fetchSimplecastEpisodes()).rejects.toThrow(
			'Simplecast episode error: 429',
		)
	} finally {
		fetchMock.mockRestore()
	}
})
