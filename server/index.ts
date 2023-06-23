import {createRequestHandler, type RequestHandler} from '@remix-run/express'
import * as Sentry from '@sentry/node'
import compression from 'compression'
import crypto from 'crypto'
import express from 'express'
import 'express-async-errors'
import fs from 'fs'
import morgan from 'morgan'
import onFinished from 'on-finished'
import path from 'path'
import serverTiming from 'server-timing'
import {
  combineGetLoadContexts,
  createMetronomeGetLoadContext,
  registerMetronome,
} from '@metronome-sh/express'
import {broadcastDevReady, type ServerBuild} from '@remix-run/node'
import chokidar from 'chokidar'
import closeWithGrace from 'close-with-grace'
import {type WebSocketServer} from 'ws'
import helmet from 'helmet'
import {getInstanceInfo} from 'litefs-js'
import {
  getRedirectsMiddleware,
  oldImgSocial,
  rickRollMiddleware,
} from './redirects'

const BUILD_DIR = path.join(process.cwd(), 'build')

const build = require(BUILD_DIR) as unknown as ServerBuild
let devBuild = build

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
    try {
      const host = getHost(req)
      return [
        tokens.method?.(req, res),
        `${host}${decodeURIComponent(tokens.url?.(req, res) ?? '')}`,
        tokens.status?.(req, res),
        tokens.res?.(req, res, 'content-length'),
        '-',
        tokens['response-time']?.(req, res),
        'ms',
      ].join(' ')
    } catch (error: unknown) {
      console.error(`Error generating morgan log line`, error, req.originalUrl)
      return ''
    }
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
          'cdn.usefathom.com',
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
          'cdn.usefathom.com',
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

function getRequestHandler(build: ServerBuild): RequestHandler {
  function getLoadContext(req: any, res: any) {
    return {cspNonce: res.locals.cspNonce}
  }
  if (MODE === 'production' && !process.env.DISABLE_METRONOME) {
    const buildWithMetronome = registerMetronome(build)
    const metronomeGetLoadContext =
      createMetronomeGetLoadContext(buildWithMetronome)
    return createRequestHandler({
      build: buildWithMetronome,
      getLoadContext: combineGetLoadContexts(
        getLoadContext,
        // @ts-expect-error huh... metronome isn't happy with itself.
        metronomeGetLoadContext,
      ),
      mode: MODE,
    })
  }
  return createRequestHandler({build, mode: MODE, getLoadContext})
}

if (MODE === 'production') {
  app.all('*', getRequestHandler(build))
} else {
  app.all('*', (...args) => getRequestHandler(devBuild)(...args))
}

const port = process.env.PORT ?? 3000
const server = app.listen(port, () => {
  console.log(`Express server listening on port ${port}`)

  if (process.env.NODE_ENV === 'development') {
    broadcastDevReady(build)
  }
})

let wss: WebSocketServer | undefined
async function startContentWatcher() {
  const {contentWatcher} = await import('./content-watcher')
  wss = contentWatcher(server)
}

if (process.env.NODE_ENV === 'development') {
  startContentWatcher().catch((err: unknown) => {
    console.error('unable to start content watcher', err)
  })
}

closeWithGrace(() => {
  return Promise.all([
    new Promise((resolve, reject) => {
      server.close(e => (e ? reject(e) : resolve('ok')))
    }),
    new Promise((resolve, reject) => {
      wss?.close(e => (e ? reject(e) : resolve('ok')))
    }),
  ])
})

// during dev, we'll keep the build module up to date with the changes
if (process.env.NODE_ENV === 'development') {
  async function reloadBuild() {
    for (const key in require.cache) {
      if (key.startsWith(BUILD_DIR)) {
        delete require.cache[key]
      }
    }
    devBuild = require(BUILD_DIR)
    broadcastDevReady(devBuild)
  }

  const watchPath = BUILD_DIR.replace(/\\/g, '/')
  const watcher = chokidar.watch(watchPath, {
    ignored: ['**/**.map'],
    ignoreInitial: true,
  })
  watcher.on('all', reloadBuild)
}

/*
eslint
  @typescript-eslint/ban-ts-comment: "off",
  @typescript-eslint/prefer-ts-expect-error: "off",
  @typescript-eslint/no-dynamic-delete: "off",
  @typescript-eslint/no-shadow: "off",
  @typescript-eslint/no-var-requires: "off",
  no-inner-declarations: "off",
  import/namespace: "off",
*/
