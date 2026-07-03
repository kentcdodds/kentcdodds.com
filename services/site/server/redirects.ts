import { type RequestHandler } from 'express'
import {
	getRickRollHtml,
	matchRedirect,
	oldImgSocialUrl,
	parseRedirectsString,
} from '../app/utils/redirects-core.server.ts'

function getRedirectsMiddleware({
	redirectsString,
}: {
	redirectsString: string
}): RequestHandler {
	const redirects = parseRedirectsString(redirectsString)

	return function redirectsMiddleware(req, res, next) {
		const host = req.header('X-Forwarded-Host') ?? req.header('host') ?? ''
		const protocol = host.includes('localhost') ? 'http' : 'https'
		const destination = matchRedirect({
			redirects,
			method: req.method,
			pathname: req.path,
			url: req.url,
			protocol,
			host,
		})
		if (destination) {
			res.redirect(307, destination)
			return
		}
		next()
	}
}

export const oldImgSocial: RequestHandler = (_req, res) => {
	res.redirect(oldImgSocialUrl)
}

export const rickRollMiddleware: RequestHandler = (req: any, res: any) => {
	return res.set('Content-Type', 'text/html').send(getRickRollHtml(res.locals.cspNonce))
}

export { getRedirectsMiddleware }
