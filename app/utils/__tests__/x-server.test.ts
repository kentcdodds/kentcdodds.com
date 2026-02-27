import { describe, expect, test, vi } from 'vitest'
import { type Tweet } from '../twitter/types/index.ts'

const { getTweetMock } = vi.hoisted(() => ({
	getTweetMock: vi.fn<(id: string) => Promise<Tweet | null>>(),
}))

vi.mock('../twitter/get-tweet.ts', () => ({
	getTweet: getTweetMock,
}))

import { getTweetEmbedHTML } from '../x.server.ts'

vi.mock('../cache.server.ts', () => ({
	cache: {
		name: 'test-cache',
		get: () => null,
		set: async () => {},
		delete: async () => {},
	},
	lruCache: {
		get: () => undefined,
		set: () => undefined,
		delete: () => undefined,
	},
}))

const truncatedTweetId = '2024575351259877487'
const fullNoteTweetId = '2024575351259877488'

function makeTweet(overrides: Partial<Tweet>): Tweet {
	return {
		__typename: 'Tweet',
		lang: 'en',
		favorite_count: 111,
		created_at: '2026-02-19T20:02:33.000Z',
		display_text_range: [0, 277],
		entities: {
			hashtags: [],
			urls: [],
			user_mentions: [],
			symbols: [],
		},
		id_str: overrides.id_str ?? truncatedTweetId,
		text: "I don't know about you...\n\nIt's not",
		user: {
			id_str: '389681470',
			name: 'Kent C. Dodds',
			screen_name: 'kentcdodds',
			profile_image_url_https:
				'https://pbs.twimg.com/profile_images/example_normal.jpg',
			verified: false,
			verified_type: 'none',
			is_blue_verified: true,
		},
		edit_control: {
			edit_tweet_ids: [overrides.id_str ?? truncatedTweetId],
			editable_until_msecs: '1771534953000',
			is_edit_eligible: true,
			edits_remaining: '5',
		},
		conversation_count: 27,
		news_action_type: 'conversation',
		isEdited: false,
		isStaleEdit: false,
		...overrides,
	}
}

const tweetById = new Map<string, Tweet>([
	[
		truncatedTweetId,
		makeTweet({
			id_str: truncatedTweetId,
			text: "I don't know about you, but recently my days have been extremely chaotic.\n\nIt's not",
			note_tweet: {
				id: 'Tm90ZVR3ZWV0UmVzdWx0czoyMDI0NTc1MzUxMTg4NDkyMjg4',
			},
		}),
	],
	[
		fullNoteTweetId,
		makeTweet({
			id_str: fullNoteTweetId,
			text: "I don't know about you, but recently my days have been extremely chaotic.\n\nIt's not",
			note_tweet: {
				id: 'Tm90ZVR3ZWV0UmVzdWx0czoyMDI0NTc1MzUxMTg4NDkyMjk5',
				note_tweet_results: {
					result: {
						text: "I don't know about you, but recently my days have been extremely chaotic.\n\nIt's not bad. I'm making progress and doing good work, but it's just utter chaos. I kinda like it.",
					},
				},
			},
		}),
	],
])

describe('getTweetEmbedHTML', () => {
	test('adds linked ellipsis when longform content is truncated', async () => {
		getTweetMock.mockImplementation(async (tweetId) => tweetById.get(tweetId) ?? null)
		const html = await getTweetEmbedHTML(
			`https://x.com/kentcdodds/status/${truncatedTweetId}`,
		)

		expect(html).toContain('It\'s not <a class="tweet-read-more"')
		expect(html).toContain(
			`href="https://x.com/kentcdodds/status/${truncatedTweetId}"`,
		)
		expect(html).not.toContain('I kinda like it.')
	})

	test('prefers full note tweet text when available', async () => {
		getTweetMock.mockImplementation(async (tweetId) => tweetById.get(tweetId) ?? null)
		const html = await getTweetEmbedHTML(
			`https://x.com/kentcdodds/status/${fullNoteTweetId}`,
		)

		expect(html).toContain(
			"It's not bad. I'm making progress and doing good work, but it's just utter chaos. I kinda like it.",
		)
		expect(html).not.toContain('class="tweet-read-more"')
	})
})
