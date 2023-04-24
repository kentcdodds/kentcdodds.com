import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import onFinished from 'on-finished'
import express from 'express'
import 'express-async-errors'
import compression from 'compression'
import morgan from 'morgan'
import * as Sentry from '@sentry/node'
import serverTiming from 'server-timing'
import {createRequestHandler} from '@remix-run/express'
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  combineGetLoadContexts,
  createMetronomeGetLoadContext,
  registerMetronome,
} from '@metronome-sh/express'
import {getInstanceInfo} from 'litefs-js'
import {
  getRedirectsMiddleware,
  oldImgSocial,
  rickRollMiddleware,
} from './redirects'
import helmet from 'helmet'

const here = (...d: Array<string>) => path.join(__dirname, ...d)
const primaryHost = 'kentcdodds.com'
const getHost = (req: {get: (key: string) => string | undefined}) =>
  req.get('X-Forwarded-Host') ?? req.get('host') ?? ''

if (process.env.FLY) {
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
app.use(serverTiming())

app.get('/img/social', oldImgSocial)

if (process.env.DISABLE_METRONOME) {
  app.post('/__metronome', (req, res) => {
    res.status(503)
    return res.send('Metronome is disabled')
  })
}

app.use(async (req, res, next) => {
  const {currentInstance, primaryInstance} = await getInstanceInfo()
  res.set('X-Powered-By', 'Kody the Koala')
  res.set('X-Fly-Region', process.env.FLY_REGION ?? 'unknown')
  res.set('X-Fly-App', process.env.FLY_APP_NAME ?? 'unknown')
  res.set('X-Fly-Instance', currentInstance)
  res.set('X-Fly-Primary-Instance', primaryInstance)
  res.set('X-Frame-Options', 'SAMEORIGIN')

  const host = getHost(req)
  if (!host.endsWith(primaryHost)) {
    res.set('X-Robots-Tag', 'noindex')
  }
  res.set('Access-Control-Allow-Origin', `https://${host}`)

  // if they connect once with HTTPS, then they'll connect with HTTPS for the next hundred years
  res.set('Strict-Transport-Security', `max-age=${60 * 60 * 24 * 365 * 100}`)
  next()
})

app.use(async (req, res, next) => {
  if (req.get('cf-visitor')) {
    // console.log(`👺 disallowed cf-visitor`, req.headers) // <-- this can be kinda noisy
    // make them wait for it... Which should cost them money...
    await new Promise(resolve => setTimeout(resolve, 90_000))
    return res.send(
      'Please go to https://kcd.dev instead! Ping Kent if you think you should not be seeing this...',
    )
  } else {
    return next()
  }
})

app.use((req, res, next) => {
  const proto = req.get('X-Forwarded-Proto')
  const host = getHost(req)
  if (proto === 'http') {
    res.set('X-Forwarded-Proto', 'https')
    res.redirect(`https://${host}${req.originalUrl}`)
    return
  }
  next()
})

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

app.use(
  morgan((tokens, req, res) => {
    const host = getHost(req)
    return [
      tokens.method?.(req, res),
      `${host}${tokens.url?.(req, res)}`,
      tokens.status?.(req, res),
      tokens.res?.(req, res, 'content-length'),
      '-',
      tokens['response-time']?.(req, res),
      'ms',
    ].join(' ')
  }),
)

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('hex')
  next()
})

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        'connect-src': MODE === 'development' ? ['ws:', "'self'"] : null,
        'font-src': ["'self'"],
        'frame-src': [
          "'self'",
          'youtube.com',
          'www.youtube.com',
          'youtu.be',
          'youtube-nocookie.com',
          'www.youtube-nocookie.com',
          'player.simplecast.com',
          'egghead.io',
          'app.egghead.io',
          'calendar.google.com',
          'codesandbox.io',
          'share.transistor.fm',
          'codepen.io',
        ],
        'img-src': [
          "'self'",
          'data:',
          'res.cloudinary.com',
          'www.gravatar.com',
          'sailfish.kentcdodds.com',
          'pbs.twimg.com',
          'i.ytimg.com',
          'image.simplecastcdn.com',
          'images.transistor.fm',
          'i2.wp.com',
          'i1.wp.com',
          'og-image-react-egghead.now.sh',
          'og-image-react-egghead.vercel.app',
          ...(MODE === 'development' ? ['cloudflare-ipfs.com'] : []),
        ],
        'media-src': ["'self'", 'res.cloudinary.com', 'data:', 'blob:'],
        'script-src': [
          "'strict-dynamic'",
          "'unsafe-eval'",
          "'self'",
          'sailfish.kentcdodds.com',
          // @ts-expect-error middleware is the worst
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
        ],
        'script-src-attr': [
          "'unsafe-inline'",
          // TODO: figure out how to make the nonce work instead of
          // unsafe-inline. I tried adding a nonce attribute where we're using
          // inline attributes, but that didn't work. I still got that it
          // violated the CSP.
        ],
        'upgrade-insecure-requests': null,
      },
    },
  }),
)

// make sure prisma-studio requests proxy to Remix properly
app.all('*', (req, res, next) => {
  if (
    req.headers.referer?.includes('prisma-studio') &&
    !req.url.includes('prisma-studio') &&
    !req.path.includes('prisma-studio')
  ) {
    req.url = `/prisma-studio${req.path}`
  }
  return next()
})

app.get(
  '/prisma-studio',
  helmet.contentSecurityPolicy({useDefaults: false}),
  helmet.referrerPolicy({policy: 'same-origin'}),
)

app.get('/redirect.html', rickRollMiddleware)

function getRequestHandlerOptions(): Parameters<
  typeof createRequestHandler
>[0] {
  const build = require('../build')
  function getLoadContext(req: any, res: any) {
    return {cspNonce: res.locals.cspNonce}
  }
  if (MODE === 'production' && !process.env.DISABLE_METRONOME) {
    const buildWithMetronome = registerMetronome(build)
    const metronomeGetLoadContext =
      createMetronomeGetLoadContext(buildWithMetronome)
    return {
      build: buildWithMetronome,
      getLoadContext: combineGetLoadContexts(
        getLoadContext,
        // @ts-expect-error huh... metronome isn't happy with itself.
        metronomeGetLoadContext,
      ),
      mode: MODE,
    }
  }
  return {build, mode: MODE, getLoadContext}
}

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
