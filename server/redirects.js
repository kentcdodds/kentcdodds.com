const {URL} = require('url')
const {pathToRegexp, compile: compileRedirectPath} = require('path-to-regexp')

function getRedirectsMiddleware({redirectsString}) {
  const possibleMethods = ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', '*']
  const redirects = []
  const lines = redirectsString.split('\n')
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    let line = lines[lineNumber]
    line = line.trim()
    if (!line || line.startsWith('#')) continue

    let methods, from, to
    const [one, two, three] = line
      .split(' ')
      .map(l => l.trim())
      .filter(Boolean)
    const splitOne = one.split(',')
    if (possibleMethods.some(m => splitOne.includes(m))) {
      methods = splitOne
      from = two
      to = three
    } else {
      methods = ['*']
      from = one
      to = two
    }

    if (!from || !to) {
      console.error(`Invalid redirect on line ${lineNumber + 1}: "${line}"`)
      continue
    }
    const keys = []

    const toUrl = to.includes('//')
      ? new URL(to)
      : new URL(`https://same_host${to}`)
    try {
      redirects.push({
        methods,
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
    const host = req.header('X-Forwarded-Host') ?? req.header('host')
    const protocol = host.includes('localhost') ? 'http' : 'https'
    let reqUrl
    try {
      reqUrl = new URL(`${protocol}://${host}${req.url}`)
    } catch (error) {
      console.error(`Invalid URL: ${protocol}://${host}${req.url}`)
      next()
      return
    }
    for (const redirect of redirects) {
      try {
        if (
          !redirect.methods.includes('*') &&
          !redirect.methods.includes(req.method)
        ) {
          continue
        }
        const match = req.path.match(redirect.from)
        if (!match) continue

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

        toUrl.protocol = protocol
        if (toUrl.host === 'same_host') toUrl.host = reqUrl.host

        for (const [key, value] of reqUrl.searchParams.entries()) {
          toUrl.searchParams.append(key, value)
        }
        toUrl.pathname = redirect.toPathname(params)
        res.redirect(307, toUrl.toString())
        return
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

module.exports = {getRedirectsMiddleware}
