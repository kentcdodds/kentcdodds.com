import {createRequestHandler, type RequestHandler} from '@remix-run/express'
import {
  broadcastDevReady,
  installGlobals,
  type ServerBuild,
} from '@remix-run/node'
import * as Sentry from '@sentry/node'
import address from 'address'
import chalk from 'chalk'
import chokidar from 'chokidar'
import closeWithGrace from 'close-with-grace'
import compression from 'compression'
import crypto from 'crypto'
import express from 'express'
import 'express-async-errors'
import fs from 'fs'
import getPort, {portNumbers} from 'get-port'
import helmet from 'helmet'
import morgan from 'morgan'
import onFinished from 'on-finished'
import path from 'path'
import serverTiming from 'server-timing'
import sourceMapSupport from 'source-map-support'
import {fileURLToPath} from 'url'
import {type WebSocketServer} from 'ws'
import {getInstanceInfo} from '../app/utils/cjs/litefs-js.js'
import {
  combineGetLoadContexts,
  createMetronomeGetLoadContext,
  registerMetronome,
} from '../app/utils/cjs/metronome-sh-express.js'
import {
  getRedirectsMiddleware,
  oldImgSocial,
  rickRollMiddleware,
} from './redirects.js'

// @ts-ignore - this file may not exist if you haven't built yet, but it will
// definitely exist by the time the dev or prod server actually runs.
import * as remixBuild from '../build/index.js'

sourceMapSupport.install()
installGlobals()

const BUILD_PATH = '../build/index.js'

const build = remixBuild as unknown as ServerBuild
let devBuild = build

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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

const desiredPort = Number(process.env.PORT || 3000)
const portToUse = await getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
})

const server = app.listen(portToUse, () => {
  const addy = server.address()
  const portUsed =
    desiredPort === portToUse
      ? desiredPort
      : addy && typeof addy === 'object'
      ? addy.port
      : 0

  if (portUsed !== desiredPort) {
    console.warn(
      chalk.yellow(
        `⚠️  Port ${desiredPort} is not available, using ${portUsed} instead.`,
      ),
    )
  }
  console.log(`\n🐨  let's get rolling!`)
  const localUrl = `http://localhost:${portUsed}`
  let lanUrl: string | null = null
  const localIp = address.ip()
  // Check if the address is a private ip
  // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
  // https://github.com/facebook/create-react-app/blob/d960b9e38c062584ff6cfb1a70e1512509a966e7/packages/react-dev-utils/WebpackDevServerUtils.js#LL48C9-L54C10
  if (/^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(localIp)) {
    lanUrl = `http://${localIp}:${portUsed}`
  }

  console.log(
    `
${chalk.bold('Local:')}            ${chalk.cyan(localUrl)}
${lanUrl ? `${chalk.bold('On Your Network:')}  ${chalk.cyan(lanUrl)}` : ''}
${chalk.bold('Press Ctrl+C to stop')}
		`.trim(),
  )

  if (process.env.NODE_ENV === 'development') {
    void broadcastDevReady(build)
  }
})

let wss: WebSocketServer | undefined
if (process.env.NODE_ENV === 'development') {
  try {
    const {contentWatcher} = await import('./content-watcher.js')
    wss = contentWatcher(server)
  } catch (error: unknown) {
    console.error('unable to start content watcher', error)
  }
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
    devBuild = await import(`${BUILD_PATH}?update=${Date.now()}`)
    void broadcastDevReady(devBuild)
  }

  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const watchPath = path.join(dirname, BUILD_PATH).replace(/\\/g, '/')
  const watcher = chokidar.watch(watchPath, {ignoreInitial: true})
  watcher.on('all', reloadBuild)
}

/*
eslint
  @typescript-eslint/ban-ts-comment: "off",
  @typescript-eslint/prefer-ts-expect-error: "off",
  @typescript-eslint/no-shadow: "off",
  import/namespace: "off",
  no-inner-declarations: "off",
*/
