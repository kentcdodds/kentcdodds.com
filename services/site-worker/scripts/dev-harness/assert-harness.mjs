/**
 * Curl-based verification for the app-worker dev harness.
 */
const baseUrl = process.env.HARNESS_URL ?? 'http://127.0.0.1:8801'

const checks = []
let failures = 0

function check(name, condition, detail = '') {
	checks.push({ name, ok: Boolean(condition), detail })
	if (!condition) failures += 1
}

async function fetchText(path, init) {
	const response = await fetch(`${baseUrl}${path}`, init)
	const text = await response.text()
	return { response, text }
}

async function main() {
	const home = await fetchText('/')
	check('GET / is 200 HTML', home.response.status === 200)
	check(
		'GET / contains homepage marker',
		home.text.includes('Kent C. Dodds') || home.text.includes('kentcdodds'),
	)

	const blog = await fetchText('/blog')
	check('GET /blog is 200', blog.response.status === 200)
	check(
		'GET /blog lists artifact post',
		blog.text.includes('super-simple-start-to-remix') ||
			blog.text.includes('Super Simple Start to Remix'),
	)

	const post = await fetchText('/blog/super-simple-start-to-remix')
	check('GET simple blog post is 200', post.response.status === 200)
	check(
		'GET simple blog post contains content',
		post.text.toLowerCase().includes('remix'),
	)
	check(
		'GET simple blog post contains serialized loader code',
		post.text.includes('"code"') || post.text.includes('code'),
	)

	const colocated = await fetchText(
		'/blog/state-colocation-will-make-your-react-app-faster',
	)
	check('GET co-located post is 200', colocated.response.status === 200)
	check(
		'GET co-located post renders component markup',
		colocated.text.includes('colocation') ||
			colocated.text.includes('Colocation'),
	)

	const uses = await fetchText('/uses')
	check('GET /uses is 200', uses.response.status === 200)

	const loginGet = await fetchText('/login')
	check('GET /login is 200', loginGet.response.status === 200)

	const loginPost = await fetch(`${baseUrl}/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			email: 'me@kentcdodds.com',
			password: 'iliketwix',
			redirectTo: '/me',
		}),
		redirect: 'manual',
	})
	const setCookie = loginPost.headers.get('set-cookie') ?? ''
	check(
		'POST /login establishes session',
		(loginPost.status === 302 || loginPost.status === 303) &&
			setCookie.includes('KCD_root_session'),
		`status=${loginPost.status}`,
	)

	const me = await fetch(`${baseUrl}/me`, {
		headers: { cookie: setCookie.split(';')[0] ?? '' },
	})
	const meText = await me.text()
	check('GET /me shows user', me.ok && meText.includes('me@kentcdodds.com'))

	const rss = await fetchText('/blog/rss.xml')
	check('GET /blog/rss.xml is 200', rss.response.status === 200)

	const sitemap = await fetchText('/sitemap.xml')
	check('GET /sitemap.xml is 200', sitemap.response.status === 200)

	const health = await fetchText('/healthcheck')
	check(
		'GET /healthcheck is OK',
		health.response.status === 200 && health.text.includes('OK'),
	)

	const redirect = await fetch(`${baseUrl}/call`, { redirect: 'manual' })
	check(
		'GET /call redirects via _redirects.txt',
		redirect.status >= 300 && redirect.status < 400,
		`location=${redirect.headers.get('location')}`,
	)

	const trailing = await fetch(`${baseUrl}/blog/`, { redirect: 'manual' })
	check(
		'GET trailing slash redirects',
		trailing.status === 301 && trailing.headers.get('location') === '/blog',
	)

	const markdown = await fetch(`${baseUrl}/blog/super-simple-start-to-remix`, {
		headers: { Accept: 'text/markdown' },
	})
	const markdownText = await markdown.text()
	check(
		'Markdown negotiation returns markdown',
		markdown.headers.get('content-type')?.includes('text/markdown') &&
			markdownText.startsWith('#'),
	)

	const rateLimitedProbe = await fetch(`${baseUrl}/`)
	check(
		'Rate limit headers present',
		rateLimitedProbe.headers.has('RateLimit-Limit'),
	)

	console.log('Harness assertion results:')
	for (const result of checks) {
		console.log(`${result.ok ? '✓' : '✗'} ${result.name}${result.detail ? ` (${result.detail})` : ''}`)
	}
	console.log(`\n${checks.length - failures}/${checks.length} passed`)
	if (failures > 0) process.exit(1)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
