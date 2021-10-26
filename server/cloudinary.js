// @ts-check
const httpProxy = require('express-http-proxy')
const emojiRegex = require('emoji-regex')

function toBase64(string) {
  return Buffer.from(string).toString('base64')
}

function emojiStrip(string) {
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
function doubleEncode(s) {
  return encodeURIComponent(encodeURIComponent(s))
}

function getSocialImageWithPreTitle({title, preTitle, featuredImage, url}) {
  const vars = `$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12`

  const encodedPreTitle = doubleEncode(emojiStrip(preTitle))
  const preTitleSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_14,h_$gh,x_$gw_mul_1.5,y_$gh_mul_1.3,l_text:kentcdodds.com:Matter-Regular.woff2_50:${encodedPreTitle}`

  const encodedTitle = doubleEncode(emojiStrip(title))
  const titleSection = `co_white,c_fit,g_north_west,w_$gw_mul_13.5,h_$gh_mul_7,x_$gw_mul_1.5,y_$gh_mul_2.3,l_text:kentcdodds.com:Matter-Regular.woff2_110:${encodedTitle}`

  const kentProfileSection = `c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent`
  const kentNameSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds`

  const encodedUrl = doubleEncode(emojiStrip(url))
  const urlSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_9,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:${encodedUrl}`

  const featuredImageIsRemote = featuredImage.startsWith('http')
  const featuredImageCloudinaryId = featuredImageIsRemote
    ? toBase64(featuredImage)
    : featuredImage.replace(/\//g, ':')
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

function getGenericSocialImage({words, featuredImage, url}) {
  const vars = `$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12`

  const encodedWords = doubleEncode(emojiStrip(words))
  const primaryWordsSection = `co_white,c_fit,g_north_west,w_$gw_mul_10,h_$gh_mul_7,x_$gw_mul_1.3,y_$gh_mul_1.5,l_text:kentcdodds.com:Matter-Regular.woff2_110:${encodedWords}`

  const kentProfileSection = `c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent`
  const kentNameSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds`

  const encodedUrl = doubleEncode(emojiStrip(url))
  const urlSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:${encodedUrl}`

  const featuredImageIsRemote = featuredImage.startsWith('http')
  const featuredImageCloudinaryId = featuredImageIsRemote
    ? toBase64(featuredImage)
    : featuredImage.replace(/\//g, ':')
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

function addCloudinaryProxies(app) {
  app.get(
    '/img/social',
    httpProxy('https://res.cloudinary.com/kentcdodds-com', {
      proxyReqPathResolver(req) {
        const [, queryParamsString] = req.url.split('?')
        const params = new URLSearchParams(queryParamsString)
        const type = params.get('type')
        let path
        if (type === '1') {
          path = getGenericSocialImage({
            words: params.get('words'),
            featuredImage: params.get('img'),
            url: params.get('url'),
          })
        }
        if (type === '2') {
          path = getSocialImageWithPreTitle({
            title: params.get('title'),
            preTitle: params.get('preTitle'),
            featuredImage: params.get('img'),
            url: params.get('url'),
          })
        }
        return path ?? req.url
      },
      userResHeaderDecorator(headers) {
        headers['cache-control'] =
          'public, immutable, max-age=86400, s-maxage=31536000'
        return headers
      },
    }),
  )

  // we're proxying cloudinary so we can set a cache control that takes advantage
  // of the shared cache with cloudflare to drastically reduce our bill for
  // image bandwidth (hopefully).
  app.all(
    '/img/*',
    // using patch-package to avoid a deprecation warning for this package:
    // https://github.com/villadora/express-http-proxy/pull/492
    httpProxy('https://res.cloudinary.com/', {
      proxyReqPathResolver(req) {
        return req.url.replace('/img', '/kentcdodds-com')
      },
      userResHeaderDecorator(headers) {
        headers['cache-control'] =
          'public, immutable, max-age=86400, s-maxage=31536000'
        return headers
      },
    }),
  )
}

module.exports = {addCloudinaryProxies}
