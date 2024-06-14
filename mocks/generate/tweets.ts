import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { installGlobals } from '@remix-run/node'
// NOTE: run this with tsx ./mocks/generate/tweets
import { getTweet } from '../../app/utils/twitter/get-tweet.ts'
import { type Tweet } from '~/utils/twitter/index.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

installGlobals()

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
const tweetDatas: Record<string, Tweet | null> = {}
for (const [key, value] of Object.entries(tweets)) {
	tweetDatas[key] = await getTweet(value)
}
await fs.promises.writeFile(
	path.join(__dirname, '../data/tweets.json'),
	JSON.stringify(tweetDatas, null, 2),
)
