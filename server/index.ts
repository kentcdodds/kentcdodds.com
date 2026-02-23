import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequestHandler, type RequestHandler } from '@react-router/express'
import {
	init as sentryInit,
	setContext as sentrySetContext,
} from '@sentry/react-router'
import { ip as ipAddress } from 'address'
import chalk from 'chalk'
import closeWithGrace from 'close-with-grace'
import compression from 'compression'
import express from 'express'
import getPort, { portNumbers } from 'get-port'
import helmet from 'helmet'
import morgan from 'morgan'
import onFinished from 'on-finished'
import { type ServerBuild } from 'react-router'
import serverTiming from 'server-timing'
import sourceMapSupport from 'source-map-support'
import { type WebSocketServer } from 'ws'
import { getEnv } from '../app/utils/env.server.ts'
import { getInstanceInfo } from '../app/utils/litefs-js.server.ts'
import { scheduleExpiredDataCleanup } from './expired-sessions-cleanup.js'
import { createRateLimitingMiddleware } from './rate-limiting.js'
import {
	getRedirectsMiddleware,
	oldImgSocial,
	rickRollMiddleware,
} from './redirects.js'
import { registerStartupShortcuts } from './startup-shortcuts.js'

sourceMapSupport.install()

const env = getEnv()
const MODE = env.NODE_ENV

const viteDevServer =
	MODE === 'production'
		? undefined
		: await import('vite').then((vite) =>
				vite.createServer({
					server: { middlewareMode: true },
				}),
			)

const getBuild = async (): Promise<ServerBuild> => {
	const allowedActionOrigins = env.allowedActionOrigins

	if (viteDevServer) {
		const build = (await viteDevServer.ssrLoadModule(
			'virtual:react-router/server-build',
		)) as any
		return { ...build, allowedActionOrigins }
	}
	// @ts-ignore (this file may or may not exist yet)
	const build = (await import('../build/server/index.js')) as any
	return { ...build, allowedActionOrigins }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const here = (...d: Array<string>) => path.join(__dirname, ...d)
const primaryHost = 'kentcdodds.com'
const getHost = (req: { get: (key: string) => string | undefined }) =>
	req.get('X-Forwarded-Host') ?? req.get('host') ?? ''

const SHOULD_INIT_SENTRY =
	MODE === 'production' &&
	Boolean(env.SENTRY_DSN) &&
	// `start:mocks` (used in CI + local e2e) runs with `MOCKS=true`.
	!env.MOCKS

if (SHOULD_INIT_SENTRY) {
	void import('./utils/monitoring.js').then(({ init }) => init())
}

if (SHOULD_INIT_SENTRY) {
	sentryInit({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 0.3,
		environment: env.NODE_ENV,
	})
	sentrySetContext('fly', {
		region: env.FLY_REGION,
		machineId: env.FLY_MACHINE_ID,
	})
}

const app = express()
// fly is our proxy
app.set('trust proxy', true)
app.use(serverTiming())

const expiredDataCleanup = scheduleExpiredDataCleanup()

app.get('/img/social', oldImgSocial)

// TODO: remove this once all clients are updated
app.post('/__metronome', (req: any, res: any) => {
	res.status(503)
	return res.send('Metronome is deprecated and no longer in use.')
})

app.use((req, res, next) => {
	getInstanceInfo()
		.then(({ currentInstance, primaryInstance }) => {
			res.set('X-Powered-By', 'Kody the Koala')
			res.set('X-Fly-Region', env.FLY_REGION)
			res.set('X-Fly-App', env.FLY_APP_NAME)
			res.set('X-Fly-Instance', currentInstance)
			res.set('X-Fly-Primary-Instance', primaryInstance)
			res.set('X-Frame-Options', 'SAMEORIGIN')
			const proto = req.get('X-Forwarded-Proto') ?? req.protocol

			const host = getHost(req)
			if (!host.endsWith(primaryHost)) {
				res.set('X-Robots-Tag', 'noindex')
			}
			res.set('Access-Control-Allow-Origin', `${proto}://${host}`)

			// if they connect once with HTTPS, then they'll connect with HTTPS for the next hundred years
			res.set(
				'Strict-Transport-Security',
				`max-age=${60 * 60 * 24 * 365 * 100}`,
			)
			next()
		})
		.catch(next)
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
	'{*splat}',
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

const publicAbsolutePath = here('../build/client')

if (viteDevServer) {
	app.use(viteDevServer.middlewares)
} else {
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
}

app.get(
	[
		'/build/{*splat}',
		'/images/{*splat}',
		'/fonts/{*splat}',
		'/favicons/{*splat}',
	],
	(req: any, res: any) => {
		// if we made it past the express.static for /build, then we're missing something. No bueno.
		return res.status(404).send('Not found')
	},
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
	morgan(
		(tokens, req, res) => {
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
				console.error(
					`Error generating morgan log line`,
					error,
					req.originalUrl,
				)
				return ''
			}
		},
		{
			skip: (req, res) => {
				if (res.statusCode !== 200) return false
				// skip health check related requests
				const headToRoot = req.method === 'HEAD' && req.originalUrl === '/'
				const getToHealthcheck =
					req.method === 'GET' && req.originalUrl === '/healthcheck'
				return headToRoot || getToHealthcheck
			},
		},
	),
)

app.use(
	createRateLimitingMiddleware({
		mode: MODE,
		playwrightTestBaseUrl: env.PLAYWRIGHT_TEST_BASE_URL,
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
				'connect-src': [
					...(MODE === 'development' ? ['ws:'] : []),
					"'self'",
				].filter(Boolean),
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
					'img.transistor.fm',
					'img.transistorcdn.com',
					'*.githubusercontent.com',
					'https://lh4.googleusercontent.com', // a google form that was embedded in a x post...
					'i2.wp.com',
					'i1.wp.com',
					'og-image-react-egghead.now.sh',
					'og-image-react-egghead.vercel.app',
					'www.epicweb.dev',
					...(MODE === 'development'
						? ['cloudflare-ipfs.com', 'cdn.jsdelivr.net']
						: []),
				],
				'media-src': [
					"'self'",
					'res.cloudinary.com',
					'data:',
					'blob:',
					'www.dropbox.com',
					'*.dropboxusercontent.com',
				],
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

// CORS support for /.well-known/*
app.options('/.well-known/{*splat}', (req, res) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.header('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS')
	res.header(
		'Access-Control-Allow-Headers',
		req.header('Access-Control-Request-Headers') || '*',
	)
	res.sendStatus(204)
})

app.use('/.well-known/{*splat}', (req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*')
	next()
})

async function getRequestHandler(): Promise<RequestHandler> {
	function getLoadContext(req: any, res: any) {
		return { cspNonce: res.locals.cspNonce }
	}
	return createRequestHandler({
		build: MODE === 'development' ? getBuild : await getBuild(),
		mode: MODE,
		getLoadContext,
	})
}

app.all('{*splat}', await getRequestHandler())

const desiredPort = env.PORT
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
	const localIp = ipAddress() ?? 'Unknown'
	// Check if the address is a private ip
	// https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
	// https://github.com/facebook/create-react-app/blob/d960b9e38c062584ff6cfb1a70e1512509a966e7/packages/react-dev-utils/WebpackDevServerUtils.js#LL48C9-L54C10
	if (/^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(localIp)) {
		lanUrl = `http://${localIp}:${portUsed}`
	}

	const isInteractiveShell = Boolean(process.stdout.isTTY)
	const shortcutsEnabled = MODE !== 'production' && isInteractiveShell
	const restartEnabled = Boolean(process.stdin.isTTY)

	let userName: string
	try {
		userName = os.userInfo().username
	} catch {
		userName = process.env.USER ?? process.env.LOGNAME ?? 'there'
	}

	const supportedKeyLines = shortcutsEnabled
		? [
				`  ${chalk.green('o')} - open app`,
				`  ${chalk.cyan('c')} - copy url`,
				restartEnabled ? `  ${chalk.magenta('r')} - restart app` : null,
				`  ${chalk.yellow('h')} - help`,
				`  ${chalk.red('q')} - exit (or Ctrl+C)`,
			].filter((line): line is string => Boolean(line))
		: []

	const startupMessageLines = [`Welcome to kentcdodds.com, ${userName}!`]

	if (shortcutsEnabled) {
		startupMessageLines.push(
			'Supported keys:',
			...supportedKeyLines,
			'It also supports hitting <enter> to add a newline to the output.',
		)
	}

	startupMessageLines.push(
		'',
		[
			`${chalk.bold('Local:')}            ${chalk.cyan(localUrl)}`,
			lanUrl
				? `${chalk.bold('On Your Network:')}  ${chalk.cyan(lanUrl)}`
				: null,
			chalk.bold('Press Ctrl+C to stop'),
		]
			.filter(Boolean)
			.join('\n'),
	)

	const startupMessage = startupMessageLines.join('\n')

	console.log(startupMessage)
	if (shortcutsEnabled) {
		registerStartupShortcuts({
			localUrl,
			helpMessage: startupMessage,
			restartEnabled,
		})
	}
})

let wss: WebSocketServer | undefined
if (MODE === 'development') {
	try {
		const { contentWatcher } = await import('./content-watcher.js')
		wss = contentWatcher(server)
	} catch (error: unknown) {
		console.error('unable to start content watcher', error)
	}
}

closeWithGrace(() => {
	return Promise.all([
		expiredDataCleanup.stop(),
		new Promise((resolve, reject) => {
			server.close((e) => (e ? reject(e) : resolve('ok')))
		}),
		new Promise((resolve, reject) => {
			if (!wss) {
				resolve('ok')
				return
			}
			wss.close((e) => (e ? reject(e) : resolve('ok')))
		}),
	])
})

/*
eslint
  @typescript-eslint/ban-ts-comment: "off",
  @typescript-eslint/prefer-ts-expect-error: "off",
  @typescript-eslint/no-shadow: "off",
  import/namespace: "off",
  no-inner-declarations: "off",
*/
