import type {DefaultRequestMultipartBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'
import tweets from './data/tweets.json'
import siteMetadata from './data/site-metadata.json'
import {isConnectedToTheInternet} from './utils'

const tweetsArray = Object.values(tweets)
const siteMetadataArray = Object.values(siteMetadata)

function getSiteMetadata(tweetUrlId: string) {
  const urlIdNumber: number = tweetUrlId
    .split('')
    .map(c => c.charCodeAt(0))
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

const twitterHandlers: Array<
  RestHandler<MockedRequest<DefaultRequestMultipartBody>>
> = [
  rest.get(
    'https://cdn.syndication.twimg.com/tweet-result',
    async (req, res, ctx) => {
      // if you want to mock out specific tweets, comment out this next line
      // eslint-disable-next-line
      if (
        (await isConnectedToTheInternet()) &&
        process.env.TWITTER_BEARER_TOKEN !== 'MOCK_TWITTER_TOKEN'
      ) {
        return
      }
      const tweetId = req.url.searchParams.get('tweet_id')
      // uncomment this and send whatever tweet you want to work with...
      // return res(ctx.json(tweets.linkWithMetadata))

      let tweet = tweetsArray.find(t => {
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
      return res(ctx.json(tweet))
    },
  ),
  rest.get('https://t.co/:tweetUrlId', async (req, res, ctx) => {
    return res(ctx.text(getSiteMetadata(req.params.tweetUrlId as string)))
  }),
  rest.head('https://t.co/:tweetUrlId', async (req, res, ctx) => {
    return res(ctx.set('x-head-mock', 'true'))
  }),
]

export {twitterHandlers}
