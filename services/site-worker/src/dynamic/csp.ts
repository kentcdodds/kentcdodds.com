const developmentImgSrc = ['cloudflare-ipfs.com', 'cdn.jsdelivr.net']

export function buildContentSecurityPolicy({
	nonce,
	mode = 'production',
}: {
	nonce: string
	mode?: string
}) {
	const connectSrc = [
		...(mode === 'development' ? ['ws:'] : []),
		"'self'",
	].filter(Boolean)

	const directives: Record<string, Array<string> | null> = {
		'default-src': ["'self'"],
		'connect-src': connectSrc,
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
			'https://lh4.googleusercontent.com',
			'i2.wp.com',
			'i1.wp.com',
			'og-image-react-egghead.now.sh',
			'og-image-react-egghead.vercel.app',
			'www.epicweb.dev',
			...(mode === 'development' ? developmentImgSrc : []),
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
			`'nonce-${nonce}'`,
		],
		'script-src-attr': ["'unsafe-inline'"],
		'style-src': ["'self'", 'https:', "'unsafe-inline'"],
		'object-src': ["'none'"],
		'base-uri': ["'self'"],
		'form-action': ["'self'"],
		'frame-ancestors': ["'self'"],
		'upgrade-insecure-requests': null,
	}

	return Object.entries(directives)
		.filter((entry): entry is [string, Array<string>] => Array.isArray(entry[1]))
		.map(([name, values]) => `${name} ${values.join(' ')}`)
		.join('; ')
}

export function applySecurityHeaders({
	headers,
	request,
	cspNonce,
	mode = 'production',
}: {
	headers: Headers
	request: Request
	cspNonce: string
	mode?: string
}) {
	const url = new URL(request.url)
	const host =
		request.headers.get('X-Forwarded-Host') ??
		request.headers.get('host') ??
		url.host
	const proto =
		request.headers.get('X-Forwarded-Proto') ??
		(url.protocol === 'http:' ? 'http' : 'https')

	headers.set('X-Powered-By', 'Kody the Koala')
	headers.set('X-Frame-Options', 'SAMEORIGIN')
	if (!host.endsWith('kentcdodds.com')) {
		headers.set('X-Robots-Tag', 'noindex')
	}
	headers.set('Access-Control-Allow-Origin', `${proto}://${host}`)
	headers.set(
		'Strict-Transport-Security',
		'max-age=31536000; includeSubDomains',
	)
	headers.set(
		'Content-Security-Policy',
		buildContentSecurityPolicy({ nonce: cspNonce, mode }),
	)
}
