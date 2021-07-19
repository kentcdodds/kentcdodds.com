// @ts-check
const fs = require('fs')
const path = require('path')
const {URL} = require('url')
const express = require('express')
const compression = require('compression')
const morgan = require('morgan')
const {pathToRegexp, compile: compileRedirectPath} = require('path-to-regexp')
const {createRequestHandler} = require('@remix-run/express')

const MODE = process.env.NODE_ENV
const BUILD_DIR = path.join(process.cwd(), 'build')

const app = express()
app.use(morgan('tiny'))
app.all('*', getRedirectsMiddleware())
app.use(compression())

// You may want to be more aggressive with this caching
app.use(express.static('public', {maxAge: '1h'}))

// If we ever change our font (which we quite possibly never will)
// then we'll just want to change the filename or something...
app.use(express.static('public/fonts', {immutable: true, maxAge: '1y'}))

// Remix fingerprints its assets so we can cache forever
app.use(express.static('public/build', {immutable: true, maxAge: '1y'}))

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

function getRedirectsMiddleware() {
  const redirectsString = fs.readFileSync('./_redirects', 'utf8')
  const redirects = []
  const lines = redirectsString.split('\n')
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    let line = lines[lineNumber]
    line = line.trim()
    if (!line || line.startsWith('#')) continue

    const [from, to] = line
      .split(' ')
      .map(l => l.trim())
      .filter(Boolean)

    if (!from || !to) {
      console.error(`Invalid redirect on line ${lineNumber}: "${line}"`)
      continue
    }
    const keys = []

    const toUrl = to.includes('//')
      ? new URL(to)
      : new URL(`https://same_host${to}`)
    try {
      redirects.push({
        from: pathToRegexp(from, keys),
        keys,
        toPathname: compileRedirectPath(toUrl.pathname, {
          encode: encodeURIComponent,
        }),
        toUrl,
      })
    } catch (error) {
      // if parsing the redirect fails, we'll warn, but we won't crash
      console.error(`Failed to parse redirect on line ${lineNumber}: "${line}"`)
    }
  }

  return function redirectsMiddleware(req, res, next) {
    for (const redirect of redirects) {
      try {
        const match = req.path.match(redirect.from)
        if (match) {
          const params = {}
          const paramValues = match.slice(1)
          for (
            let paramIndex = 0;
            paramIndex < paramValues.length;
            paramIndex++
          ) {
            const paramValue = paramValues[paramIndex]
            params[redirect.keys[paramIndex].name] = paramValue
          }
          const toUrl = redirect.toUrl
          const host = req.header('X-Forwarded-Host') ?? req.header('host')
          const protocol = host.includes('localhost') ? 'http' : 'https'
          const reqUrl = new URL(`${protocol}://${host}${req.url}`)

          toUrl.protocol = protocol
          if (toUrl.host === 'same_host') toUrl.host = reqUrl.host

          for (const [key, value] of reqUrl.searchParams.entries()) {
            toUrl.searchParams.append(key, value)
          }
          toUrl.pathname = redirect.toPathname(params)
          res.redirect(307, toUrl.toString())
          return
        }
      } catch (error) {
        // an error in the redirect shouldn't stop the request from going through
        console.error(`Error processing redirects:`, {
          error,
          redirect,
          'req.url': req.url,
        })
      }
    }
    next()
  }
}
