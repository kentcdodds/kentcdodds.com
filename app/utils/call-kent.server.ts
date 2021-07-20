import {createCookieSessionStorage} from 'remix'
import * as transistor from './transistor.server'

let callKentSessionSecret = 'not-even-a-little-secret'
if (process.env.CALL_KENT_SESSION_SECRET) {
  callKentSessionSecret = process.env.CALL_KENT_SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set CALL_KENT_SESSION_SECRET')
}

const callKentStorage = createCookieSessionStorage({
  cookie: {
    name: '__call_kent_session',
    secrets: [callKentSessionSecret],
    sameSite: 'lax',
    path: '/call',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 * 2,
  },
})

type CallKentEpisode = {
  title: string
  summary: string
  description: string
  keywords: string
  duration: number
  shareUrl: string
  mediaUrl: string
  embedHtml: string
  embedHtmlDark: string
  imageUrl: string
  publishedAt: string
}
async function getEpisodes(): Promise<Array<CallKentEpisode>> {
  const transistorEpisodes = await transistor.getEpisodes()
  const episodes: Array<CallKentEpisode> = []
  for (const episode of transistorEpisodes.data) {
    if (episode.attributes.status !== 'published') continue
    episodes.push({
      title: episode.attributes.title,
      summary: episode.attributes.summary,
      description: episode.attributes.description,
      keywords: episode.attributes.keywords,
      duration: episode.attributes.duration,
      shareUrl: episode.attributes.share_url,
      mediaUrl: episode.attributes.media_url,
      embedHtml: episode.attributes.embed_html,
      embedHtmlDark: episode.attributes.embed_html_dark,
      imageUrl: episode.attributes.image_url,
      publishedAt: episode.attributes.published_at,
    })
  }
  return episodes
}

export {callKentStorage, getEpisodes}
