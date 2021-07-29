import http from 'http'
import https from 'https'
import makeMetascraper from 'metascraper'
import mImage from 'metascraper-image'
import mTitle from 'metascraper-title'
import mDescription from 'metascraper-description'
import {getRequiredServerEnvVar, typedBoolean} from './misc'

const token = getRequiredServerEnvVar('TWITTER_BEARER_TOKEN')

const metascraper = makeMetascraper([mTitle(), mDescription(), mImage()])

type Metadata = {
  // metascraper has types, but they just say all these values will be there
  // whether you're actually parsing for them or not.
  title?: string
  description?: string
  image?: string
}
async function getMetadata(url: string): Promise<Metadata> {
  const html = await fetch(url).then(res => res.text())
  return metascraper({html, url})
}

function unshorten(
  urlString: string,
  maxFollows: number = 10,
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString)
      if (url.protocol) {
        const {request} = url.protocol === 'https:' ? https : http
        request(urlString, {method: 'HEAD'}, response => {
          const {
            headers: {location},
          } = response
          if (location && location !== urlString && maxFollows > 0) {
            const fullLocation = location.startsWith('/')
              ? new URL(location, url).toString()
              : location
            void unshorten(fullLocation, maxFollows - 1).then(resolve)
          } else {
            resolve(urlString)
          }
        }).end()
      } else {
        reject(`Invalid URL: ${urlString}`)
      }
    } catch (error: unknown) {
      reject(error)
    }
  })
}

type Latitude = number
type Longitude = number
type Media = {
  media_key: string
  type: 'photo' | 'animated_gif' | 'video'
  url: string
  preview_image_url?: string
}
type TweetData = {
  id: string
  author_id: string
  text: string
  created_at: string
  public_metrics: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
  }
  in_reply_to_user_id?: string
  attachments?: {media_keys: Array<string>}
  referenced_tweets?: Array<{
    type: 'replied_to' | 'retweeted' | 'quoted'
    id: string
  }>
  entities?: {
    mentions: Array<{
      start: number
      end: number
      username: string
      id: string
    }>
  }

  geo?: {
    place_id: string
    full_name: string
    geo: {
      type: 'Feature'
      bbox: [Latitude, Longitude, Latitude, Longitude]
      properties: {}
    }
  }
}
type User = {
  id: string
  url: string
  name: string
  username: string
  profile_image_url: string
}
type TweetJsonResponse = {
  data: TweetData
  includes: {
    users?: Array<User>
    media?: Array<Media>
    tweets: Array<TweetData>
  }
}

type TweetErrorJsonResponse = {
  errors: Array<{
    value: string
    detail: string
    title: 'Not Found Error'
    resource_type: 'tweet'
    parameter: 'id'
    resource_id: string
    type: string
  }>
}

// fetch tweet from API
async function getTweet(tweetId: string) {
  const url = new URL(`https://api.twitter.com/2/tweets/${tweetId}`)
  const params = {
    'tweet.fields': 'public_metrics,created_at',
    expansions:
      'author_id,attachments.media_keys,entities.mentions.username,in_reply_to_user_id,referenced_tweets.id,referenced_tweets.id.author_id,geo.place_id',
    'user.fields': 'name,username,url,profile_image_url',
    'media.fields': 'preview_image_url,url,type',
    'place.fields': 'full_name,geo',
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const tweetJson = await response.json()
  return tweetJson as TweetJsonResponse | TweetErrorJsonResponse
}

function buildMediaList(medias: Array<Media>, link?: string) {
  const width = medias.length > 1 ? '50%' : '100%'
  const imgs = medias
    .map(media => {
      const src = media.preview_image_url ?? media.url
      return `<img data-type="${media.type}" src="${src}" width="${width}" loading="lazy" alt="Tweet media" />`
    })
    .join('')
  const grid = `<div class="tweet-media-continer" data-count="${medias.length}">${imgs}</div>`
  if (link) {
    return `<a href="${link}" target="_blank" rel="noreferrer noopener">${grid}</a>`
  } else {
    return grid
  }
}

const likesSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 72"><path d="M38.723,12c-7.187,0-11.16,7.306-11.723,8.131C26.437,19.306,22.504,12,15.277,12C8.791,12,3.533,18.163,3.533,24.647 C3.533,39.964,21.891,55.907,27,56c5.109-0.093,23.467-16.036,23.467-31.353C50.467,18.163,45.209,12,38.723,12z"/></svg>`
const repliesSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 72"><path d="M41 31h-9V19c0-1.14-.647-2.183-1.668-2.688-1.022-.507-2.243-.39-3.15.302l-21 16C5.438 33.18 5 34.064 5 35s.437 1.82 1.182 2.387l21 16c.533.405 1.174.613 1.82.613.453 0 .908-.103 1.33-.312C31.354 53.183 32 52.14 32 51V39h9c5.514 0 10 4.486 10 10 0 2.21 1.79 4 4 4s4-1.79 4-4c0-9.925-8.075-18-18-18z"/></svg>`
const retweetSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 72"><path d="M70.676 36.644C70.166 35.636 69.13 35 68 35h-7V19c0-2.21-1.79-4-4-4H34c-2.21 0-4 1.79-4 4s1.79 4 4 4h18c.552 0 .998.446 1 .998V35h-7c-1.13 0-2.165.636-2.676 1.644-.51 1.01-.412 2.22.257 3.13l11 15C55.148 55.545 56.046 56 57 56s1.855-.455 2.42-1.226l11-15c.668-.912.767-2.122.256-3.13zM40 48H22c-.54 0-.97-.427-.992-.96L21 36h7c1.13 0 2.166-.636 2.677-1.644.51-1.01.412-2.22-.257-3.13l-11-15C18.854 15.455 17.956 15 17 15s-1.854.455-2.42 1.226l-11 15c-.667.912-.767 2.122-.255 3.13C3.835 35.365 4.87 36 6 36h7l.012 16.003c.002 2.208 1.792 3.997 4 3.997h22.99c2.208 0 4-1.79 4-4s-1.792-4-4-4z"/></svg>`

async function buildTweetHTML(
  tweet: TweetJsonResponse,
  expandQuotedTweet: boolean,
) {
  const author = tweet.includes.users?.find(
    user => user.id === tweet.data.author_id,
  )
  if (!author) {
    console.error(tweet.data.author_id, tweet.includes.users)
    throw new Error('unable to find tweet author')
  }

  const tweetURL = `https://twitter.com/${author.username}/status/${tweet.data.id}`

  // _normal is only 48x48 which looks bad on high-res displays
  // _bigger is 73x73 which looks better...
  const authorImg = author.profile_image_url.replace('_normal', '_bigger')
  const authorHTML = `<a class="tweet-author" href="https://twitter.com/${author.username}" target="_blank" rel="noreferrer noopener"><img src="${authorImg}" loading="lazy" alt="${author.name} avatar" /><b>${author.name}</b>@${author.username}</a>`

  const links = (
    await Promise.all(
      [...tweet.data.text.matchAll(/https:\/\/t.co\/\w+/g)].map(
        async ([shortLink], index, array) => {
          if (!shortLink) return
          const isLast = index === array.length - 1
          const longLink = await unshorten(shortLink).catch(() => shortLink)
          const longUrl = new URL(longLink)
          const isTwitterLink = longUrl.host === 'twitter.com'
          // TODO: handle more than just twitter links. If it's the last link, try to expand the og:title/image information and display that instead.
          let replacement = `<a href="${longLink}" target="_blank" rel="noreferrer noopener">${longLink}</a>`
          const isReferenced = (tweet.data.referenced_tweets ?? []).some(r =>
            longLink.includes(r.id),
          )
          let metadata: Metadata | null = null
          if (isReferenced) {
            // we'll handle the referenced tweet later
            replacement = ''
          }
          const isTwitterMediaLink =
            isTwitterLink && /\/(video|photo)\//.test(longUrl.pathname)
          if (isTwitterMediaLink) {
            // we just embed the media link as an href around the media
            replacement = ''
          }

          if (!isTwitterLink) {
            // we don't want to get metadata for tweets.
            metadata = await getMetadata(longLink).catch(() => null)
          }

          if (metadata) {
            if (isLast) {
              // We put the embed at the end
              replacement = ''
            } else if (metadata.title) {
              replacement = `<a href="${longLink}" target="_blank" rel="noreferrer noopener">${metadata.title}</a>`
            }
          }
          return {
            shortLink,
            isTwitterLink,
            longLink,
            longUrl,
            replacement,
            metadata,
          }
        },
      ),
    )
  ).filter(typedBoolean)

  let blockquote = tweet.data.text
  for (let index = 0; index < links.length; index++) {
    const linkInfo = links[index]
    if (!linkInfo) continue
    const {shortLink, replacement} = linkInfo
    blockquote = blockquote.replaceAll(shortLink, replacement)
  }

  if (expandQuotedTweet) {
    const referencedTweetHTMLs = await Promise.all(
      (tweet.data.referenced_tweets ?? []).map(async referencedTweet => {
        if (referencedTweet.type !== 'quoted') return ''
        const quotedTweet = await getTweet(referencedTweet.id).catch(() => {})
        if (!quotedTweet || !('data' in quotedTweet)) return ''

        const quotedHTML = await buildTweetHTML(quotedTweet, false).catch(
          () => {},
        )
        if (!quotedHTML) return ''

        return `<div class="tweet-quoted">${quotedHTML}</div>`
      }),
    )

    blockquote = `${blockquote}${referencedTweetHTMLs.join('')}`
  }

  // twitterify @mentions
  blockquote = blockquote.replace(
    /@(\w+)/g,
    `<a href="https://twitter.com/$1" target="_blank" rel="noreferrer noopener">$&</a>`,
  )

  const tweetHTML = `<blockquote>${blockquote.trim()}</blockquote>`

  const lastLink = links[links.length - 1]
  const mediaHTML = tweet.includes.media
    ? buildMediaList(
        tweet.includes.media,
        lastLink?.isTwitterLink ? lastLink.longLink : '',
      )
    : ''

  const lastMetadataLink = links.reverse().find(l => l.metadata)
  let linkMetadataHTML = ''
  if (lastMetadataLink) {
    const {metadata: md, longLink, longUrl} = lastMetadataLink
    linkMetadataHTML = `
        <a href="${longLink}" class="tweet-ref-metadata" target="_blank" rel="noreferrer noopener">
          <img class="tweet-ref-metadata-image" src="${md?.image}" loading="lazy" alt="Referenced media" />
          <div class="tweet-ref-metadata-title">${md?.title}</div>
          <div class="tweet-ref-metadata-description">${md?.description}</div>
          <div class="tweet-ref-metadata-domain">${longUrl.hostname}</div>
        </a>
      `
  }

  const createdAtHTML = `<div class="tweet-time"><a href="${tweetURL}" target="_blank" rel="noreferrer noopener">${new Date(
    tweet.data.created_at,
  ).toLocaleTimeString()} – ${new Date(
    tweet.data.created_at,
  ).toLocaleDateString()}</a></div>`

  const likeIntent = `https://twitter.com/intent/like?tweet_id=${tweet.data.id}`
  const retweetIntent = `https://twitter.com/intent/retweet?tweet_id=${tweet.data.id}`
  const replyIntent = tweetURL

  const {like_count, reply_count, retweet_count, quote_count} =
    tweet.data.public_metrics
  const totalRetweets = retweet_count + quote_count
  const statsHTML = `
    <div class="tweet-stats">
      <a href="${likeIntent}" class="tweet-like" target="_blank" rel="noreferrer noopener">${likesSVG}${like_count}</a>
      <a href="${replyIntent}" class="tweet-reply" target="_blank" rel="noreferrer noopener">${repliesSVG}${reply_count}</a>
      <a href="${retweetIntent}" class="tweet-retweet" target="_blank" rel="noreferrer noopener">${retweetSVG}${totalRetweets}</a>
    </div>
  `

  return `
    <div class="tweet-embed">
      ${authorHTML}
      ${tweetHTML}
      ${mediaHTML}
      ${linkMetadataHTML}
      ${createdAtHTML}
      ${statsHTML}
    </div>
  `.trim()
}

async function getTweetEmbedHTML(urlString: string) {
  const url = new URL(urlString)
  const tweetId = url.pathname.split('/').pop()

  if (!tweetId) {
    console.error('TWEET ID NOT FOUND', urlString, tweetId)
    return ''
  }
  let tweet
  try {
    tweet = await getTweet(tweetId)
    if (!('data' in tweet)) {
      throw new Error('Oh no, tweet has no data.')
    }
    return await buildTweetHTML(tweet, true)
  } catch (error: unknown) {
    console.error('Error processing tweet', {urlString, tweetId, error, tweet})
    return ''
  }
}

function isTwitterUrl(urlString: string) {
  const url = new URL(urlString)
  return /\.?twitter\.com/.test(url.hostname)
}

export {getTweetEmbedHTML, isTwitterUrl}
