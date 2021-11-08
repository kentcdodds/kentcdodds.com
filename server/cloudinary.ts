import type {Express as App} from 'express'
import httpProxy from 'express-http-proxy'
import emojiRegex from 'emoji-regex'

const isString = (s: unknown): s is string => typeof s === 'string'

function toBase64(string: string) {
  return Buffer.from(string).toString('base64')
}

function emojiStrip(string: string) {
  return (
    string
      .replace(emojiRegex(), '')
      // get rid of double spaces:
      .split(' ')
      .filter(Boolean)
      .join(' ')
      .trim()
  )
}

// cloudinary needs double-encoding
function doubleEncode(s: string) {
  return encodeURIComponent(encodeURIComponent(s))
}

function getSocialImageWithPreTitle({
  title,
  preTitle,
  img,
  url,
}: Record<string, unknown>) {
  if (
    !isString(title) ||
    !isString(preTitle) ||
    !isString(img) ||
    !isString(url)
  ) {
    return null
  }

  const vars = `$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12`

  const encodedPreTitle = doubleEncode(emojiStrip(preTitle))
  const preTitleSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_14,h_$gh,x_$gw_mul_1.5,y_$gh_mul_1.3,l_text:kentcdodds.com:Matter-Regular.woff2_50:${encodedPreTitle}`

  const encodedTitle = doubleEncode(emojiStrip(title))
  const titleSection = `co_white,c_fit,g_north_west,w_$gw_mul_13.5,h_$gh_mul_7,x_$gw_mul_1.5,y_$gh_mul_2.3,l_text:kentcdodds.com:Matter-Regular.woff2_110:${encodedTitle}`

  const kentProfileSection = `c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent`
  const kentNameSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds`

  const encodedUrl = doubleEncode(emojiStrip(url))
  const urlSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_9,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:${encodedUrl}`

  const featuredImageIsRemote = img.startsWith('http')
  const featuredImageCloudinaryId = featuredImageIsRemote
    ? toBase64(img)
    : img.replace(/\//g, ':')
  const featuredImageLayerType = featuredImageIsRemote ? 'l_fetch:' : 'l_'
  const featuredImageSection = `c_fill,ar_3:4,r_12,g_east,h_$gh_mul_10,x_$gw,${featuredImageLayerType}${featuredImageCloudinaryId}`

  return [
    `https://res.cloudinary.com/kentcdodds-com/image/upload`,
    vars,
    preTitleSection,
    titleSection,
    kentProfileSection,
    kentNameSection,
    urlSection,
    featuredImageSection,
    `c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png`,
  ].join('/')
}

function getGenericSocialImage({words, img, url}: Record<string, unknown>) {
  if (!isString(words) || !isString(img) || !isString(url)) return null

  const vars = `$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12`

  const encodedWords = doubleEncode(emojiStrip(words))
  const primaryWordsSection = `co_white,c_fit,g_north_west,w_$gw_mul_10,h_$gh_mul_7,x_$gw_mul_1.3,y_$gh_mul_1.5,l_text:kentcdodds.com:Matter-Regular.woff2_110:${encodedWords}`

  const kentProfileSection = `c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent`
  const kentNameSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds`

  const encodedUrl = doubleEncode(emojiStrip(url))
  const urlSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:${encodedUrl}`

  const featuredImageIsRemote = img.startsWith('http')
  const featuredImageCloudinaryId = featuredImageIsRemote
    ? toBase64(img)
    : img.replace(/\//g, ':')
  const featuredImageLayerType = featuredImageIsRemote ? 'l_fetch:' : 'l_'

  const featureImageSection = `c_fit,g_east,w_$gw_mul_11,h_$gh_mul_11,x_$gw,${featuredImageLayerType}${featuredImageCloudinaryId}`

  const backgroundSection = `c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png`
  return [
    `kentcdodds-com/image/upload`,
    vars,
    primaryWordsSection,
    kentProfileSection,
    kentNameSection,
    urlSection,
    featureImageSection,
    backgroundSection,
  ].join('/')
}

function addCloudinaryProxies(app: App) {
  app.get(
    '/img/social',
    httpProxy('https://res.cloudinary.com/kentcdodds-com', {
      proxyReqPathResolver(req) {
        const [, queryParamsString] = req.url.split('?')
        const params: Record<string, string> = {}
        for (const [key, value] of new URLSearchParams(queryParamsString)) {
          params[key] = value
        }
        const {type} = params
        return (
          (type === '1'
            ? getGenericSocialImage(params)
            : type === '2'
            ? getSocialImageWithPreTitle(params)
            : null) ?? req.url
        )
      },
    }),
  )

  app.all(
    '/img/*',
    // using patch-package to avoid a deprecation warning for this package:
    // https://github.com/villadora/express-http-proxy/pull/492
    httpProxy('https://res.cloudinary.com/', {
      proxyReqPathResolver(req) {
        return req.url.replace('/img', '/kentcdodds-com')
      },
    }),
  )
}

export {addCloudinaryProxies}
