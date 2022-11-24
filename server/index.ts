import fs from 'fs'
import path from 'path'
import onFinished from 'on-finished'
import express from 'express'
import 'express-async-errors'
import compression from 'compression'
import morgan from 'morgan'
import * as Sentry from '@sentry/node'
import {createRequestHandler} from '@remix-run/express'
// eslint-disable-next-line import/no-extraneous-dependencies
import {installGlobals} from '@remix-run/node/dist/globals'
import {
  createMetronomeGetLoadContext,
  registerMetronome,
} from '@metronome-sh/express'
import {addCloudinaryProxies} from './cloudinary'
import {getRedirectsMiddleware} from './redirects'
import {getInstanceInfo, getReplayResponse, txMiddleware} from './fly'

installGlobals()

const here = (...d: Array<string>) => path.join(__dirname, ...d)

// TODO: enable this
const enableSentry = false
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (enableSentry && process.env.FLY) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.3,
    environment: process.env.NODE_ENV,
  })
  Sentry.setContext('region', {name: process.env.FLY_INSTANCE ?? 'unknown'})
}

const MODE = process.env.NODE_ENV
const BUILD_DIR = path.join(process.cwd(), 'build')

const app = express()

app.use((req, res, next) => {
  const {currentInstance, primaryInstance} = getInstanceInfo()
  res.set('X-Powered-By', 'Kody the Koala')
  res.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown')
  res.set('X-Fly-App', process.env.FLY_APP_NAME ?? 'unknown')
  res.set('X-Fly-Instance', currentInstance)
  res.set('X-Fly-Primary-Instance', primaryInstance)

  const host = req.get('X-Forwarded-Host') ?? req.get('host')
  if (!host?.endsWith('kentcdodds.com')) {
    res.set('X-Robots-Tag', 'noindex')
  }

  // if they connect once with HTTPS, then they'll connect with HTTPS for the next hundred years
  res.set('Strict-Transport-Security', `max-age=${60 * 60 * 24 * 365 * 100}`)
  next()
})

app.use((req, res, next) => {
  const proto = req.get('X-Forwarded-Proto')
  const host = req.get('X-Forwarded-Host') ?? req.get('host')
  if (proto === 'http') {
    res.set('X-Forwarded-Proto', 'https')
    res.redirect(`https://${host}${req.originalUrl}`)
    return
  }
  next()
})

app.all('*', getReplayResponse)

addCloudinaryProxies(app)

app.all(
  '*',
  getRedirectsMiddleware({
    redirectsString: fs.readFileSync(here('./_redirects.txt'), 'utf8'),
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

const publicAbsolutePath = here('../public')

app.use(
  express.static(publicAbsolutePath, {
    maxAge: '1w',
    setHeaders(res, resourcePath) {
      const relativePath = resourcePath.replace(`${publicAbsolutePath}/`, '')
      if (relativePath.startsWith('build/info.json')) {
        res.setHeader('cache-control', 'no-cache')
        return
      }
      // If we ever change our font (which we quite possibly never will)
      // then we'll just want to change the filename or something...
      // Remix fingerprints its assets so we can cache forever
      if (
        relativePath.startsWith('fonts') ||
        relativePath.startsWith('build')
      ) {
        res.setHeader('cache-control', 'public, max-age=31536000, immutable')
      }
    },
  }),
)

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

app.use(morgan('tiny'))

const enableMetronome = true

function getRequestHandlerOptions(): Parameters<
  typeof createRequestHandler
>[0] {
  const build = require('../build')
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (MODE === 'production' && enableMetronome) {
    const buildWithMetronome = registerMetronome(build)
    const metronomeGetLoadContext =
      createMetronomeGetLoadContext(buildWithMetronome)
    return {
      build: buildWithMetronome,
      getLoadContext: metronomeGetLoadContext,
      mode: MODE,
    }
  }
  return {build, mode: MODE}
}

app.all('*', txMiddleware)

if (MODE === 'production') {
  app.all('*', createRequestHandler(getRequestHandlerOptions()))
} else {
  app.all('*', (req, res, next) => {
    purgeRequireCache()
    return createRequestHandler(getRequestHandlerOptions())(req, res, next)
  })
}

const port = process.env.PORT ?? 3000
app.listen(port, () => {
  // preload the build so we're ready for the first request
  // we want the server to start accepting requests asap, so we wait until now
  // to preload the build
  require('../build')
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
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete require.cache[key]
    }
  }
}

/*
eslint
  @typescript-eslint/no-var-requires: "off",
*/
