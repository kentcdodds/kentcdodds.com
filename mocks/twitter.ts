import path from 'path'
import fsExtra from 'fs-extra'
import {
	http,
	type DefaultRequestMultipartBody,
	type HttpHandler,
	HttpResponse,
} from 'msw'
import type SiteMetadata from './data/site-metadata.json'
import type Tweets from './data/tweets.json'
import { isConnectedToTheInternet } from './utils.ts'

// use readJson as long as Import assertions is experimental
// import siteMetadata from './data/site-metadata.json' assert {type: 'json'}
// import type tweets from './data/tweets.json' assert {type: 'json'}
const here = (s: string) => path.join(process.cwd(), './mocks/data', s)
const read = (s: string) => fsExtra.readJsonSync(here(s))
const tweets = read('tweets.json') as typeof Tweets
const siteMetadata = read('site-metadata.json') as typeof SiteMetadata

const tweetsArray = Object.values(tweets)
const siteMetadataArray = Object.values(siteMetadata)

function getSiteMetadata(tweetUrlId: string) {
	const urlIdNumber: number = tweetUrlId
		.split('')
		.map((c) => c.charCodeAt(0))
		.reduce((a, n) => a + n, 0)
	const index = urlIdNumber % siteMetadataArray.length
	const metadata = siteMetadataArray[index]
	if (!metadata) {
		throw new Error(
			`no metadata found for id ${tweetUrlId}. This should be impossible...`,
		)
	}
	return metadata
}

const twitterHandlers: Array<HttpHandler> = [
	http.get<any, DefaultRequestMultipartBody>(
		'https://cdn.syndication.twimg.com/tweet-result',
		async ({ request }) => {
			const url = new URL(request.url)

			// if you want to mock out specific tweets, comment out this next line

			if (
				(await isConnectedToTheInternet()) &&
				process.env.TWITTER_BEARER_TOKEN !== 'MOCK_TWITTER_TOKEN'
			) {
				return
			}
			const tweetId = url.searchParams.get('tweet_id')
			// uncomment this and send whatever tweet you want to work with...
			// return res(ctx.json(tweets.linkWithMetadata))

			let tweet = tweetsArray.find((t) => {
				if ('data' in t) {
					return tweetId === t.id_str
				} else {
					console.warn(`mock tweet data that does not match!`, t)
					return false
				}
			})
			if (!tweet) {
				const tweetNumber = Number(tweetId)
				const index = tweetNumber % tweetsArray.length
				tweet = tweetsArray[index]
			}
			if (!tweet) {
				throw new Error(
					`no tweet found for id ${tweetId}. This should be impossible...`,
				)
			}
			return HttpResponse.json(tweet)
		},
	),
	http.get<any, DefaultRequestMultipartBody>(
		'https://t.co/:tweetUrlId',
		async ({ params }) => {
			return HttpResponse.text(getSiteMetadata(params.tweetUrlId as string))
		},
	),
	http.head<any, DefaultRequestMultipartBody>(
		'https://t.co/:tweetUrlId',
		async () => {
			return HttpResponse.json(null, { headers: { 'x-head-mock': 'true' } })
		},
	),
]

export { twitterHandlers }
