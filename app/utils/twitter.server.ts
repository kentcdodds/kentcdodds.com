import http from 'http'
import https from 'https'
import makeMetascraper from 'metascraper'
import mImage from 'metascraper-image'
import mTitle from 'metascraper-title'
import mDescription from 'metascraper-description'
import {formatDate, formatNumber, typedBoolean} from './misc'
import cachified, {verboseReporter} from 'cachified'
import {cache, lruCache} from './cache.server'
import {getTweet} from './twitter/get-tweet'
import type {Tweet} from './twitter/types'

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

async function getTweetCached(tweetId: string) {
  return cachified({
    key: `tweet:${tweetId}`,
    cache: lruCache,
    reporter: verboseReporter(),
    ttl: 1000 * 60,
    getFreshValue: () => getTweet(tweetId),
  })
}

const playSvg = `<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg"><circle cx="37.4883" cy="37.8254" r="37" fill="white" /><path fillRule="evenodd" clipRule="evenodd" d="M35.2643 33.025L41.0017 36.9265C41.6519 37.369 41.6499 38.3118 40.9991 38.7518L35.2616 42.6276C34.5113 43.1349 33.4883 42.6077 33.4883 41.7143V33.9364C33.4883 33.0411 34.5146 32.5151 35.2643 33.025" /></svg>`

function buildMediaList(
  mediaDetails: NonNullable<Tweet['mediaDetails']>,
  link?: string,
) {
  const width = mediaDetails.length > 1 ? '50%' : '100%'
  const imgs = mediaDetails
    .map(media => {
      const src = media.media_url_https
      const imgHTML = `<img src="${src}" width="${width}" loading="lazy" alt="Tweet media" />`
      if (media.type === 'animated_gif' || media.type === 'video') {
        return `<div class="tweet-media-with-play-button"><div class="tweet-media-play-button">${playSvg}</div>${imgHTML}</div>`
      } else {
        return imgHTML
      }
    })
    .join('')
  const grid = `<div class="tweet-media-container"><div class="tweet-media-grid" data-count="${mediaDetails.length}">${imgs}</div></div>`
  if (link) {
    return `<a href="${link}" target="_blank" rel="noreferrer noopener">${grid}</a>`
  } else {
    return grid
  }
}

const likesSVG = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><g><path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z"></path></g></svg>`
const repliesSVG = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><g><path d="M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z"></path></g></svg>`
const retweetSVG = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><g><path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"></path></g></svg>`
const linkSvg = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><g><path d="M11.96 14.945c-.067 0-.136-.01-.203-.027-1.13-.318-2.097-.986-2.795-1.932-.832-1.125-1.176-2.508-.968-3.893s.942-2.605 2.068-3.438l3.53-2.608c2.322-1.716 5.61-1.224 7.33 1.1.83 1.127 1.175 2.51.967 3.895s-.943 2.605-2.07 3.438l-1.48 1.094c-.333.246-.804.175-1.05-.158-.246-.334-.176-.804.158-1.05l1.48-1.095c.803-.592 1.327-1.463 1.476-2.45.148-.988-.098-1.975-.69-2.778-1.225-1.656-3.572-2.01-5.23-.784l-3.53 2.608c-.802.593-1.326 1.464-1.475 2.45-.15.99.097 1.975.69 2.778.498.675 1.187 1.15 1.992 1.377.4.114.633.528.52.928-.092.33-.394.547-.722.547z"></path><path d="M7.27 22.054c-1.61 0-3.197-.735-4.225-2.125-.832-1.127-1.176-2.51-.968-3.894s.943-2.605 2.07-3.438l1.478-1.094c.334-.245.805-.175 1.05.158s.177.804-.157 1.05l-1.48 1.095c-.803.593-1.326 1.464-1.475 2.45-.148.99.097 1.975.69 2.778 1.225 1.657 3.57 2.01 5.23.785l3.528-2.608c1.658-1.225 2.01-3.57.785-5.23-.498-.674-1.187-1.15-1.992-1.376-.4-.113-.633-.527-.52-.927.112-.4.528-.63.926-.522 1.13.318 2.096.986 2.794 1.932 1.717 2.324 1.224 5.612-1.1 7.33l-3.53 2.608c-.933.693-2.023 1.026-3.105 1.026z"></path></g></svg>`
const arrowSvg = `<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.25 15.25V6.75H8.75"></path>
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 7L6.75 17.25"></path>
</svg>
`

async function buildTweetHTML(tweet: Tweet, expandQuotedTweet: boolean) {
  const author = tweet.user
  const tweetURL = `https://twitter.com/${author.screen_name}/status/${tweet.id_str}`

  // _normal is only 48x48 which looks bad on high-res displays
  // _bigger is 73x73 which looks better...
  const authorImg = author.profile_image_url_https.replace('_normal', '_bigger')
  const authorHTML = `
    <a class="tweet-author" href="https://twitter.com/${author.screen_name}" target="_blank" rel="noreferrer noopener">
      <img src="${authorImg}" loading="lazy" alt="${author.name} avatar" />
      <div>
        <span class="tweet-author-name">${author.name}</span>
        <span class="tweet-author-handle">@${author.screen_name}</span>
      </div>
    </a>`

  const links = (
    await Promise.all(
      [...tweet.text.matchAll(/https:\/\/t.co\/\w+/g)].map(
        async ([shortLink], index, array) => {
          if (!shortLink) return
          const isLast = index === array.length - 1
          const longLink = await unshorten(shortLink).catch(() => shortLink)
          const longUrl = new URL(longLink)
          const isTwitterLink = longUrl.host === 'twitter.com'
          let replacement = `<a href="${longLink}" target="_blank" rel="noreferrer noopener">${
            longUrl.hostname + longUrl.pathname
          }</a>`
          const isReferenced =
            tweet.quoted_tweet?.id_str &&
            longLink.includes(tweet.quoted_tweet.id_str)
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
            if (isLast && !tweet.mediaDetails?.length) {
              // We put the embed at the end
              replacement = ''
            } else {
              replacement = `<a href="${longLink}" target="_blank" rel="noreferrer noopener">${
                metadata.title ?? longUrl.hostname + longUrl.pathname
              }</a>`
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

  let blockquote = tweet.text
  for (let index = 0; index < links.length; index++) {
    const linkInfo = links[index]
    if (!linkInfo) continue
    const {shortLink, replacement} = linkInfo
    blockquote = blockquote.replaceAll(shortLink, replacement)
  }

  let expandedQuoteTweetHTML = ''
  if (expandQuotedTweet && tweet.quoted_tweet) {
    const quotedTweet = await getTweetCached(tweet.quoted_tweet.id_str).catch(
      () => {},
    )
    if (quotedTweet) {
      const quotedHTML = await buildTweetHTML(quotedTweet, false).catch(
        () => {},
      )
      if (quotedHTML) {
        expandedQuoteTweetHTML = `<div class="tweet-quoted">${quotedHTML}</div>`
      }
    }
  }

  // twitterify @mentions
  blockquote = blockquote.replace(
    /@(\w+)/g,
    `<a href="https://twitter.com/$1" target="_blank" rel="noreferrer noopener">$&</a>`,
  )

  const tweetHTML = `<blockquote>${blockquote.trim()}</blockquote>`

  const mediaHTML = tweet.mediaDetails?.length
    ? buildMediaList(tweet.mediaDetails, tweetURL)
    : ''

  const lastMetadataLink = links.reverse().find(l => l.metadata)
  let linkMetadataHTML = ''
  if (lastMetadataLink && !mediaHTML) {
    const {metadata: md, longLink, longUrl} = lastMetadataLink
    if (md) {
      const title = md.title ?? 'Unknown title'
      const titleHtml = `<div class="tweet-ref-metadata-title">${title}</div>`
      const imgHtml = md.image
        ? `<img class="tweet-ref-metadata-image" src="${md.image}" loading="lazy" alt="Referenced media" />`
        : ''
      const descHtml = md.description
        ? `<div class="tweet-ref-metadata-description">${md.description}</div>`
        : ''
      const urlHtml = `<div class="tweet-ref-metadata-domain">${linkSvg}<span>${longUrl.hostname}</span></div>`
      linkMetadataHTML = `
<a href="${longLink}" class="tweet-ref-metadata" target="_blank" rel="noreferrer noopener">
  ${imgHtml}
  ${titleHtml}
  ${descHtml}
  ${urlHtml}
</a>
      `.trim()
    }
  }

  const createdAtHTML = `<div class="tweet-time"><a href="${tweetURL}" target="_blank" rel="noreferrer noopener">${formatDate(
    tweet.created_at,
    'h:mm a',
  )} (UTC) · ${formatDate(new Date(tweet.created_at))}</a></div>`

  const likeIntent = `https://twitter.com/intent/like?tweet_id=${tweet.id_str}`
  const retweetIntent = `https://twitter.com/intent/retweet?tweet_id=${tweet.id_str}`
  const replyIntent = tweetURL

  const {favorite_count, conversation_count} = tweet
  const likeCount = formatNumber(favorite_count)
  const replyCount = formatNumber(conversation_count)
  const statsHTML = `
    <div class="tweet-stats">
      <a href="${replyIntent}" class="tweet-reply" target="_blank" rel="noreferrer noopener">${repliesSVG}<span>${replyCount}</span></a>
      <a href="${retweetIntent}" class="tweet-retweet" target="_blank" rel="noreferrer noopener">${retweetSVG}</a>
      <a href="${likeIntent}" class="tweet-like" target="_blank" rel="noreferrer noopener">${likesSVG}<span>${likeCount}</span></a>
      <a href="${tweetURL}" class="tweet-link" target="_blank" rel="noreferrer noopener">${arrowSvg}<span></span></a>
    </div>
  `

  return `
    <div class="tweet-embed">
      ${authorHTML}
      ${tweetHTML}
      ${mediaHTML}
      ${linkMetadataHTML}
      ${expandedQuoteTweetHTML}
      ${createdAtHTML}
      ${statsHTML}
    </div>
  `.trim()
}

async function getTweetEmbedHTML(urlString: string) {
  return cachified({
    key: `tweet:embed:${urlString}`,
    ttl: 1000 * 60 * 60 * 24,
    cache,
    reporter: verboseReporter(),
    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30 * 6,
    getFreshValue: () => getTweetEmbedHTMLImpl(urlString),
  })
}

async function getTweetEmbedHTMLImpl(urlString: string) {
  const url = new URL(urlString)
  const tweetId = url.pathname.split('/').pop()

  if (!tweetId) {
    console.error('TWEET ID NOT FOUND', urlString, tweetId)
    return ''
  }
  let tweet: Awaited<ReturnType<typeof getTweet>>
  try {
    tweet = await getTweetCached(tweetId)
    if (!tweet) {
      throw new Error('Oh no, tweet has no data.')
    }
    const html = await buildTweetHTML(tweet, true)
    return html
  } catch (error: unknown) {
    console.error('Error processing tweet', {urlString, tweetId, error, tweet})
    throw error
  }
}

function isTwitterUrl(urlString: string) {
  const url = new URL(urlString)
  return /\.?twitter\.com/.test(url.hostname)
}

export {getTweetEmbedHTML, isTwitterUrl}
