import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
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

const twitterHandlers: Array<RestHandler<MockedRequest<DefaultRequestBody>>> = [
  rest.get(
    'https://api.twitter.com/2/tweets/:tweetId',
    async (req, res, ctx) => {
      // if you want to mock out specific tweets, comment out this next line
      // eslint-disable-next-line
      if (await isConnectedToTheInternet()) return
      // uncomment this and send whatever tweet you want to work with...
      // return res(ctx.json(tweets.linkWithMetadata))

      let tweet = tweetsArray.find(t => {
        if ('data' in t) {
          return req.params.tweetId === t.data.id
        } else if ('errors' in t) {
          return t.errors.some(e => e.resource_id === req.params.tweetId)
        } else {
          console.warn(`mock tweet data that does not match!`, t)
          return false
        }
      })
      if (!tweet) {
        const tweetNumber = Number(req.params.tweetId)
        const index = tweetNumber % tweetsArray.length
        tweet = tweetsArray[index]
      }
      if (!tweet) {
        throw new Error(
          `no tweet found for id ${req.params.tweetId}. This should be impossible...`,
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
