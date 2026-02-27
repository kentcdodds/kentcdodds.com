type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
}

type MockTweet = {
	id_str: string
	text: string
	created_at: string
	favorite_count: number
	conversation_count: number
	user: {
		id_str: string
		name: string
		screen_name: string
		profile_image_url_https: string
		verified: boolean
		verified_type: string
		is_blue_verified: boolean
	}
	mediaDetails: Array<{
		type: 'photo' | 'video' | 'animated_gif'
		media_url_https: string
	}>
}

const requestLog: Array<RequestLogEntry> = []
let nextRequestId = 1

const mockTweets = new Map<string, MockTweet>([
	[
		'783161196945944580',
		{
			id_str: '783161196945944580',
			text: 'I spent a few minutes working on this, just for you all.',
			created_at: '2026-02-20T10:00:00.000Z',
			favorite_count: 42,
			conversation_count: 9,
			user: {
				id_str: '389681470',
				name: 'Kent C. Dodds',
				screen_name: 'kentcdodds',
				profile_image_url_https:
					'https://pbs.twimg.com/profile_images/mock-normal.jpg',
				verified: false,
				verified_type: 'none',
				is_blue_verified: true,
			},
			mediaDetails: [],
		},
	],
	[
		'2024575351259877487',
		{
			id_str: '2024575351259877487',
			text: "I don't know about you...\n\nIt's not https://t.co/mock-link",
			created_at: '2026-02-19T20:02:33.000Z',
			favorite_count: 111,
			conversation_count: 27,
			user: {
				id_str: '389681470',
				name: 'Kent C. Dodds',
				screen_name: 'kentcdodds',
				profile_image_url_https:
					'https://pbs.twimg.com/profile_images/mock-normal.jpg',
				verified: false,
				verified_type: 'none',
				is_blue_verified: true,
			},
			mediaDetails: [],
		},
	],
])

export default {
	async fetch(
		request: Request,
		_unusedEnv: unknown,
		_unusedCtx: unknown,
	) {
		const url = new URL(request.url)
		recordRequest({
			method: request.method,
			path: url.pathname,
			query: url.search,
		})

		if (url.pathname === '/__mocks/meta') {
			return jsonResponse({
				service: 'twitter',
				description: 'Mock Twitter/X syndication + oEmbed worker',
				dashboard: '/__mocks',
				themeSupport: ['light', 'dark'],
				responsive: true,
				requestCount: requestLog.length,
			})
		}

		if (url.pathname === '/__mocks/requests') {
			return jsonResponse({ requests: [...requestLog].reverse() })
		}

		if (url.pathname === '/__mocks/reset' && request.method === 'POST') {
			requestLog.length = 0
			nextRequestId = 1
			return jsonResponse({ success: true })
		}

		if (url.pathname === '/__mocks') {
			return htmlResponse(renderDashboard())
		}

		if (request.method === 'GET' && url.pathname === '/tweet-result') {
			const id = url.searchParams.get('id')
			if (!id) {
				const firstTweet = mockTweets.values().next().value
				return jsonResponse(firstTweet ?? {})
			}
			const tweet = mockTweets.get(id)
			if (!tweet) return jsonResponse({}, 404)
			return jsonResponse(tweet)
		}

		if (request.method === 'GET' && /^\/short\/[^/]+$/.test(url.pathname)) {
			const shortId = url.pathname.split('/')[2]
			if (!shortId) return jsonResponse({ error: 'missing short id' }, 400)
			return Response.redirect(`https://x.com/kentcdodds/status/${shortId}`, 302)
		}

		if (request.method === 'HEAD' && /^\/short\/[^/]+$/.test(url.pathname)) {
			const shortId = url.pathname.split('/')[2]
			if (!shortId) return new Response(null, { status: 400 })
			return new Response(null, {
				status: 200,
				headers: {
					location: `https://x.com/kentcdodds/status/${shortId}`,
					'x-head-mock': 'true',
				},
			})
		}

		if (request.method === 'GET' && url.pathname === '/oembed') {
			const tweetUrl = url.searchParams.get('url') ?? 'https://x.com/kentcdodds/status/783161196945944580'
			return jsonResponse({
				html: `<blockquote class="twitter-tweet" data-theme="dark"><p lang="en" dir="ltr">Mock embedded tweet</p><a href="${escapeHtml(tweetUrl)}">View post</a></blockquote>`,
			})
		}

		return jsonResponse(
			{
				error: `Unhandled mock request: ${request.method} ${url.pathname}`,
			},
			404,
		)
	},
}

function recordRequest({
	method,
	path,
	query,
}: {
	method: string
	path: string
	query: string
}) {
	requestLog.push({
		id: nextRequestId++,
		method,
		path,
		query,
		createdAt: new Date().toISOString(),
	})
	if (requestLog.length > 200) {
		requestLog.shift()
	}
}

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function htmlResponse(html: string) {
	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function renderDashboard() {
	const rows = [...requestLog]
		.reverse()
		.slice(0, 50)
		.map(
			(entry) => `<tr>
      <td>${entry.id}</td>
      <td>${escapeHtml(entry.method)}</td>
      <td>${escapeHtml(entry.path + entry.query)}</td>
      <td>${escapeHtml(entry.createdAt)}</td>
    </tr>`,
		)
		.join('\n')

	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Twitter Mock Dashboard</title>
    <style>
      :root { color-scheme: light dark; --bg: #fff; --fg: #0f172a; --muted: #64748b; --border: #cbd5e1; }
      @media (prefers-color-scheme: dark) { :root { --bg: #0b1120; --fg: #e2e8f0; --muted: #94a3b8; --border: #334155; } }
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
      .layout { padding: 1rem; max-width: 1000px; margin: 0 auto; }
      .summary { color: var(--muted); }
      .toolbar { display: flex; gap: 0.5rem; margin: 1rem 0; flex-wrap: wrap; }
      button { border: 1px solid var(--border); background: transparent; color: inherit; border-radius: 0.5rem; padding: 0.5rem 0.75rem; cursor: pointer; }
      table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); }
      th, td { border-bottom: 1px solid var(--border); padding: 0.5rem; text-align: left; }
      @media (max-width: 700px) { table, thead, tbody, tr, th, td { display: block; } thead { display: none; } }
    </style>
  </head>
  <body>
    <main class="layout">
      <h1>Twitter Mock Dashboard</h1>
      <p class="summary">Syndication + short-link + oEmbed request history.</p>
      <div class="toolbar">
        <button id="refresh" type="button">Refresh</button>
        <button id="reset" type="button">Reset state</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Method</th>
            <th>Path</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4">No requests yet.</td></tr>'}
        </tbody>
      </table>
    </main>
    <script>
      document.getElementById('refresh')?.addEventListener('click', () => window.location.reload())
      document.getElementById('reset')?.addEventListener('click', async () => {
        await fetch('/__mocks/reset', { method: 'POST' })
        window.location.reload()
      })
    </script>
  </body>
</html>`
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}
