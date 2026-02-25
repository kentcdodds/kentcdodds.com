type MockEmail = {
	id: number
	to: string
	from: string
	subject: string
	text: string
	html: string
	createdAt: string
}

type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
}

const requestLog = [] as Array<RequestLogEntry>
const emails = [] as Array<MockEmail>

let nextRequestLogId = 1
let nextEmailId = 1

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
				service: 'mailgun',
				description: 'Mock Mailgun API worker',
				dashboard: '/__mocks',
				themeSupport: ['light', 'dark'],
				responsive: true,
				requestCount: requestLog.length,
				emailCount: emails.length,
			})
		}

		if (url.pathname === '/__mocks/requests') {
			return jsonResponse({ requests: [...requestLog].reverse() })
		}

		if (url.pathname === '/__mocks/emails') {
			return jsonResponse({ emails: [...emails].reverse() })
		}

		if (url.pathname === '/__mocks/reset' && request.method === 'POST') {
			resetState()
			return jsonResponse({ success: true })
		}

		if (url.pathname === '/__mocks') {
			return htmlResponse(renderDashboard())
		}

		if (request.method === 'POST' && /^\/v3\/[^/]+\/messages$/.test(url.pathname)) {
			const body = await request.text()
			const params = new URLSearchParams(body)
			const email = createMockEmail({
				to: params.get('to') ?? '',
				from: params.get('from') ?? '',
				subject: params.get('subject') ?? '',
				text: params.get('text') ?? '',
				html: params.get('html') ?? '',
			})
			emails.push(email)
			if (emails.length > 500) {
				emails.shift()
			}
			const randomId = `${Date.now()}.${email.id}.MOCKMAILGUN`
			return jsonResponse({
				id: `<${randomId}@mock.mailgun.local>`,
				message: 'Queued. Thank you.',
			})
		}

		return jsonResponse(
			{ error: `Unhandled mock request: ${request.method} ${url.pathname}` },
			404,
		)
	},
}

function createMockEmail({
	to,
	from,
	subject,
	text,
	html,
}: {
	to: string
	from: string
	subject: string
	text: string
	html: string
}) {
	return {
		id: nextEmailId++,
		to,
		from,
		subject,
		text,
		html,
		createdAt: new Date().toISOString(),
	}
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
		id: nextRequestLogId++,
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
	emails.length = 0
	nextRequestLogId = 1
	nextEmailId = 1
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
	const rows = [...emails]
		.reverse()
		.slice(0, 50)
		.map(
			(email) => `<tr>
      <td>${email.id}</td>
      <td>${escapeHtml(email.to)}</td>
      <td>${escapeHtml(email.subject)}</td>
      <td>${escapeHtml(email.createdAt)}</td>
    </tr>`,
		)
		.join('\n')

	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mailgun Mock Dashboard</title>
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
      <h1>Mailgun Mock Dashboard</h1>
      <p class="summary">
        Captured emails and request activity for the Mailgun mock worker.
      </p>
      <div class="toolbar">
        <button id="refresh" type="button">Refresh</button>
        <button id="reset" type="button">Reset state</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>To</th>
            <th>Subject</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4">No emails captured yet.</td></tr>'}
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
