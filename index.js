// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
require('@remix-run/node/globals').installGlobals()
const fs = require('fs')
const path = require('path')
const {addCloudinaryProxies} = require('./server/cloudinary')
const {getRedirectsMiddleware} = require('./server/redirects')
const {getReplayResponse} = require('./server/fly')
const onFinished = require('on-finished')
const express = require('express')
const compression = require('compression')
const morgan = require('morgan')
const {createRequestHandler} = require('@remix-run/express')

if (process.env.FLY) {
  const Sentry = require('@sentry/node')
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.3,
    environment: process.env.NODE_ENV,
  })
  Sentry.setContext('region', process.env.FLY_REGION ?? 'unknown')
}

const MODE = process.env.NODE_ENV
const BUILD_DIR = path.join(process.cwd(), 'build')

const app = express()

app.use((req, res, next) => {
  res.set('X-Powered-By', 'Kody the Koala')
  res.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown')
  // if they connect once with HTTPS, then they'll connect with HTTPS for the next hundred years
  res.set('Strict-Transport-Security', `max-age=${60 * 60 * 24 * 365 * 100}`)
  next()
})

app.use((req, res, next) => {
  const proto = req.get('X-Forwarded-Proto')
  if (proto === 'http') {
    res.set('X-Forwarded-Proto', 'https')
    res.redirect(`https://${req.get('host')}${req.url}`)
    return
  }
  next()
})

app.all('*', getReplayResponse)

addCloudinaryProxies(app)

app.all(
  '*',
  getRedirectsMiddleware({
    redirectsString: fs.readFileSync('./_redirects', 'utf8'),
  }),
)

app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.slice(req.path.length)
    const safepath = req.path.slice(0, -1).replace(/\/+/g, '/')
    res.redirect(301, safepath + query)
  } else {
    next()
  }
})

app.use(compression())

app.use(express.static('public', {maxAge: '1w'}))

// If we ever change our font (which we quite possibly never will)
// then we'll just want to change the filename or something...
app.use(express.static('public/fonts', {immutable: true, maxAge: '1y'}))

// Remix fingerprints its assets so we can cache forever
app.use(express.static('public/build', {immutable: true, maxAge: '1y'}))

app.use(morgan('tiny'))

// log the referrer for 404s
app.use((req, res, next) => {
  onFinished(res, () => {
    const referrer = req.get('referer')
    if (res.statusCode === 404 && referrer) {
      console.info(
        `👻 404 on ${req.method} ${req.path} referred by: ${referrer}`,
      )
    }
  })
  next()
})

app.all(
  '*',
  MODE === 'production'
    ? createRequestHandler({build: require('./build')})
    : (req, res, next) => {
        purgeRequireCache()
        const build = require('./build')
        return createRequestHandler({build, mode: MODE})(req, res, next)
      },
)

const port = process.env.PORT ?? 3000
app.listen(port, () => {
  // preload the build so we're ready for the first request
  // we want the server to start accepting requests asap, so we wait until now
  // to preload the build
  require('./build')
  console.log(`Express server listening on port ${port}`)
})

////////////////////////////////////////////////////////////////////////////////
function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't const
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key]
    }
  }
}
