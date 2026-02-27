type DiscordUser = {
	id: string
	username: string
	discriminator: string
}

type DiscordMember = {
	user: DiscordUser
	roles: Array<string>
}

type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
}

const requestLog = [] as Array<RequestLogEntry>
const guildMembers = new Map<string, DiscordMember>()
const botMessages = [] as Array<{
	id: number
	channelId: string
	content: string
	createdAt: string
}>

let nextRequestId = 1
let nextMessageId = 1

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
				service: 'discord',
				description: 'Mock Discord API worker',
				dashboard: '/__mocks',
				themeSupport: ['light', 'dark'],
				responsive: true,
				requestCount: requestLog.length,
			})
		}

		if (url.pathname === '/__mocks/requests') {
			return jsonResponse({ requests: [...requestLog].reverse() })
		}

		if (url.pathname === '/__mocks/messages') {
			return jsonResponse({ messages: [...botMessages].reverse() })
		}

		if (url.pathname === '/__mocks/reset' && request.method === 'POST') {
			resetState()
			return jsonResponse({ success: true })
		}

		if (url.pathname === '/__mocks') {
			return htmlResponse(renderDashboard())
		}

		if (url.pathname === '/api/oauth2/token' && request.method === 'POST') {
			return jsonResponse({
				token_type: 'test_token_type',
				access_token: 'test_access_token',
			})
		}

		if (url.pathname === '/api/users/@me' && request.method === 'GET') {
			return jsonResponse({
				id: 'test_discord_id',
				username: 'test_discord_username',
				discriminator: '0000',
			})
		}

		if (request.method === 'GET' && /^\/api\/users\/[^/]+$/.test(url.pathname)) {
			const userId = url.pathname.split('/').pop() ?? 'unknown'
			return jsonResponse({
				id: userId,
				username: `${userId}_username`,
				discriminator: '0000',
			})
		}

		if (
			request.method === 'PUT' &&
			/^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname)
		) {
			const userId = url.pathname.split('/').pop() ?? 'unknown'
			const member = getOrCreateMember(userId)
			guildMembers.set(userId, member)
			return jsonResponse({})
		}

		if (
			request.method === 'PATCH' &&
			/^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname)
		) {
			const userId = url.pathname.split('/').pop() ?? 'unknown'
			const payload = (await request.json().catch(() => null)) as {
				roles?: Array<string>
			} | null
			const member = getOrCreateMember(userId)
			member.roles = Array.isArray(payload?.roles) ? payload.roles : member.roles
			guildMembers.set(userId, member)
			return jsonResponse({})
		}

		if (
			request.method === 'GET' &&
			/^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname)
		) {
			const userId = url.pathname.split('/').pop() ?? 'unknown'
			return jsonResponse(getOrCreateMember(userId))
		}

		if (
			request.method === 'POST' &&
			/^\/api\/channels\/[^/]+\/messages$/.test(url.pathname)
		) {
			const channelId = url.pathname.split('/')[3] ?? 'unknown-channel'
			const payload = (await request.json().catch(() => null)) as {
				content?: string
			} | null
			botMessages.push({
				id: nextMessageId++,
				channelId,
				content: payload?.content ?? '',
				createdAt: new Date().toISOString(),
			})
			return jsonResponse({})
		}

		return jsonResponse(
			{
				error: `Unhandled mock request: ${request.method} ${url.pathname}`,
			},
			404,
		)
	},
}

function getOrCreateMember(userId: string) {
	const existing = guildMembers.get(userId)
	if (existing) return existing
	const user: DiscordUser = {
		id: userId,
		username: `${userId}_username`,
		discriminator: '0000',
	}
	const member: DiscordMember = { user, roles: [] }
	guildMembers.set(userId, member)
	return member
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

function resetState() {
	requestLog.length = 0
	guildMembers.clear()
	botMessages.length = 0
	nextRequestId = 1
	nextMessageId = 1
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
	const requestRows = [...requestLog]
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
    <title>Discord Mock Dashboard</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #ffffff;
        --fg: #0f172a;
        --muted: #64748b;
        --border: #cbd5e1;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0b1120;
          --fg: #e2e8f0;
          --muted: #94a3b8;
          --border: #334155;
        }
      }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: var(--bg);
        color: var(--fg);
      }
      .layout {
        padding: 1rem;
        max-width: 1000px;
        margin: 0 auto;
      }
      .summary {
        color: var(--muted);
      }
      .toolbar {
        display: flex;
        gap: 0.5rem;
        margin: 1rem 0;
      }
      button {
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid var(--border);
      }
      th, td {
        border-bottom: 1px solid var(--border);
        padding: 0.5rem;
        text-align: left;
      }
      @media (max-width: 700px) {
        table, thead, tbody, tr, th, td {
          display: block;
        }
        thead {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="layout">
      <h1>Discord Mock Dashboard</h1>
      <p class="summary">
        Recent requests for the Discord mock worker.
      </p>
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
          ${requestRows || '<tr><td colspan="4">No requests yet.</td></tr>'}
        </tbody>
      </table>
    </main>
    <script>
      document.getElementById('refresh')?.addEventListener('click', () => {
        window.location.reload()
      })
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
