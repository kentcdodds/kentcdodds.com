import { compile as compileRedirectPath, pathToRegexp } from 'path-to-regexp'

export type ParsedRedirect = {
	methods: Array<string>
	from: RegExp
	keys: ReturnType<typeof pathToRegexp>['keys']
	toPathname: ReturnType<typeof compileRedirectPath>
	toUrl: URL
}

function typedBoolean<T>(
	value: T,
): value is Exclude<T, '' | 0 | false | null | undefined> {
	return Boolean(value)
}

export function parseRedirectsString(
	redirectsString: string,
): Array<ParsedRedirect> {
	const possibleMethods = ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', '*']
	return redirectsString
		.split('\n')
		.map((line, lineNumber) => {
			if (!line.trim() || line.startsWith('#')) return null

			let methods: Array<string> | undefined
			let from: string | undefined
			let to: string | undefined
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
				console.error(
					`Failed to parse redirect on line ${lineNumber + 1}: "${line}"`,
				)
				return null
			}
		})
		.filter(typedBoolean)
}

export function matchRedirect({
	redirects,
	method,
	pathname,
	url,
	protocol,
	host,
}: {
	redirects: Array<ParsedRedirect>
	method: string
	pathname: string
	url: string
	protocol: string
	host: string
}): string | null {
	let reqUrl: URL
	try {
		reqUrl = new URL(`${protocol}://${host}${url}`)
	} catch {
		console.error(`Invalid URL: ${protocol}://${host}${url}`)
		return null
	}

	for (const redirect of redirects) {
		try {
			if (
				!redirect.methods.includes('*') &&
				!redirect.methods.includes(method)
			) {
				continue
			}
			const match = redirect.from.exec(pathname)
			if (!match) continue

			const params: Record<string, string | Array<string>> = {}
			const paramValues = match.slice(1)
			for (
				let paramIndex = 0;
				paramIndex < paramValues.length;
				paramIndex++
			) {
				const paramValue = paramValues[paramIndex]
				const key = redirect.keys[paramIndex]
				if (key && paramValue) {
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
			return toUrl.toString()
		} catch (error: unknown) {
			console.error(`Error processing redirects:`, {
				error,
				redirect,
				url,
			})
		}
	}
	return null
}

export function getRickRollHtml(cspNonce: string) {
	return `
<!--
  this page is a joke. It allows me to do a client-side redirect so twitter
  won't show when I'm rick-rolling someone 🤭
-->
<script nonce=${cspNonce}>
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
  `
}
