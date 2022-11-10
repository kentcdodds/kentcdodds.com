require('dotenv').config()
// eslint-disable-next-line import/no-extraneous-dependencies
require('@remix-run/node/dist/globals').installGlobals()
// NOTE: run this with tsx ./mocks/generate/tweets
const fs = require('fs')
const path = require('path')
const {getTweet} = require('../../app/utils/twitter.server')

async function go() {
  const tweets = {
    video: '1420669402932932611',
    onePhoto: '1418928039069511682',
    twoPhotos: '1410709329951354880',
    fourPhotos: '1404408769551994880',
    threePhotos: '1420726342996271105',
    quote: '1420720925868052486',
    simpleWithMention: '1420508470726463489',
    reply: '1418772893190606852',
    quoteOfQuote: '1420020360293011456',
    poll: '1415491278008033280',
    linkWithMetadata: '1414579379422711809',
    textOnly: '1413326124969459714',
    quoteOfDeletedTweet: '1406244165529137159',
    deletedTweet: '1406128033216356353',
    streamEmbed: '1403018951639113733',
  }
  const tweetDatas = {}
  for (const [key, value] of Object.entries(tweets)) {
    // eslint-disable-next-line no-await-in-loop
    tweetDatas[key] = await getTweet(value)
  }
  await fs.promises.writeFile(
    path.join(__dirname, '../data/tweets.json'),
    JSON.stringify(tweetDatas, null, 2),
  )
}

go()
