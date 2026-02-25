import { type RequestHandler } from 'express'
import { compile as compileRedirectPath, pathToRegexp } from 'path-to-regexp'

function typedBoolean<T>(
	value: T,
): value is Exclude<T, '' | 0 | false | null | undefined> {
	return Boolean(value)
}

function getRedirectsMiddleware({
	redirectsString,
}: {
	redirectsString: string
}): RequestHandler {
	// `redirectsString` is read at server startup; change `server/_redirects.txt`
	// and restart the server to pick up updates.
	const possibleMethods = ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', '*']
	const redirects = redirectsString
		.split('\n')
		.map((line, lineNumber) => {
			if (!line.trim() || line.startsWith('#')) return null

			let methods, from, to
			const [one, two, three] = line
				.split(/\s+/)
				.map((l) => l.trim())
				.filter(Boolean)
			if (!one) return null

			const splitOne = one.split(',')
			if (possibleMethods.some((m) => splitOne.includes(m))) {
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
				return null
			}
			const toUrl = to.includes('//')
				? new URL(to)
				: new URL(`https://same_host${to}`)
			try {
				const { regexp, keys } = pathToRegexp(from)
				return {
					methods,
					from: regexp,
					keys,
					toPathname: compileRedirectPath(toUrl.pathname, {
						encode: encodeURIComponent,
					}),
					toUrl,
				}
			} catch {
				// if parsing the redirect fails, we'll warn, but we won't crash
				console.error(
					`Failed to parse redirect on line ${lineNumber + 1}: "${line}"`,
				)
				return null
			}
		})
		.filter(typedBoolean)

	return function redirectsMiddleware(req, res, next) {
		const host = req.header('X-Forwarded-Host') ?? req.header('host')
		const protocol = host?.includes('localhost') ? 'http' : 'https'
		let reqUrl
		try {
			reqUrl = new URL(`${protocol}://${host}${req.url}`)
		} catch {
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
				const match = redirect.from.exec(req.path)
				if (!match) continue

				const params: Record<string, string | string[]> = {}
				const paramValues = match.slice(1)
				for (
					let paramIndex = 0;
					paramIndex < paramValues.length;
					paramIndex++
				) {
					const paramValue = paramValues[paramIndex]
					const key = redirect.keys[paramIndex]
					if (key && paramValue) {
						// `path-to-regexp@8` wildcard params (`*name`) expect an array
						// of path segments when compiling a destination URL.
						params[key.name] =
							key.type === 'wildcard'
								? paramValue.split('/').filter(Boolean)
								: paramValue
					}
				}
				const toUrl = new URL(redirect.toUrl)

				toUrl.protocol = protocol
				if (toUrl.host === 'same_host') toUrl.host = reqUrl.host

				for (const [key, value] of reqUrl.searchParams.entries()) {
					toUrl.searchParams.append(key, value)
				}
				toUrl.pathname = redirect.toPathname(params)
				res.redirect(307, toUrl.toString())
				return
			} catch (error: unknown) {
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

export const oldImgSocial: RequestHandler = (req, res) => {
	const socialUrl = new URL('https://media.kentcdodds.com/social/generic.png')
	socialUrl.searchParams.set(
		'words',
		'Helping people make the world a better place through quality software.',
	)
	socialUrl.searchParams.set(
		'featuredImage',
		'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_blue',
	)
	socialUrl.searchParams.set('url', 'kentcdodds.com')
	res.redirect(
		socialUrl.toString(),
	)
}

export const rickRollMiddleware: RequestHandler = (req: any, res: any) => {
	return res.set('Content-Type', 'text/html').send(`
<!--
  this page is a joke. It allows me to do a client-side redirect so twitter
  won't show when I'm rick-rolling someone 🤭
-->
<script nonce=${res.locals.cspNonce}>
  var urlToRedirectTo = getQueryStringParam(location.href, 'url') || '/'
  window.location.replace(urlToRedirectTo)
  function getQueryStringParam(url, name) {
    var regexReadyName = name.replace(/[\\[]/, '\\[').replace(/[\\]]/, '\\]')
    var regex = new RegExp(\`[\\\\?&]\${regexReadyName}=([^&#]*)\`)
    var results = regex.exec(url)
    return results === null
      ? ''
      : decodeURIComponent(results[1].replace(/\\+/g, ' '))
  }
</script>
  `)
}

export { getRedirectsMiddleware }
