type KitSubscriber = {
	id: number
	first_name: string
	email_address: string
	state: 'active' | 'inactive'
	created_at: string
	fields: Record<string, string | null>
}

type SubscriptionRecord = {
	id: number
	sourceId: string
	sourceType: 'form' | 'tag'
	subscriber: KitSubscriber
	createdAt: string
}

type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
	body: string | null
}

const mockState = {
	nextSubscriptionId: 1_000_000_000,
	nextSubscriberId: 987_654_321,
	nextRequestLogId: 1,
	subscriptionsByEmail: new Map<string, SubscriptionRecord>(),
	requestLog: [] as Array<RequestLogEntry>,
}

const defaultTag = {
	id: 1,
	name: 'Subscribed: general newsletter',
	created_at: '2021-06-09T17:54:22Z',
}

export default {
	async fetch(
		request: Request,
		_unusedEnv: unknown,
		_unusedCtx: unknown,
	) {
		const url = new URL(request.url)
		const body = await readRequestBody(request)
		recordRequest({
			method: request.method,
			path: url.pathname,
			query: url.search,
			body,
		})

		if (url.pathname === '/__mocks/meta') {
			return jsonResponse({
				service: 'kit',
				description: 'Mock ConvertKit/Kit API worker',
				endpoints: [
					'GET /v3/subscribers',
					'GET /v3/subscribers/:subscriberId/tags',
					'POST /v3/forms/:formId/subscribe',
					'POST /v3/tags/:tagId/subscribe',
				],
				dashboard: '/__mocks',
				themeSupport: ['light', 'dark'],
				responsive: true,
				requestCount: mockState.requestLog.length,
			})
		}

		if (url.pathname === '/__mocks/requests') {
			return jsonResponse({ requests: [...mockState.requestLog].reverse() })
		}

		if (url.pathname === '/__mocks/reset' && request.method === 'POST') {
			resetState()
			return jsonResponse({ success: true })
		}

		if (url.pathname === '/__mocks') {
			return htmlResponse(renderDashboard())
		}

		if (url.pathname === '/v3/subscribers' && request.method === 'GET') {
			const subscribers = [...mockState.subscriptionsByEmail.values()].map(
				({ subscriber }) => subscriber,
			)
			return jsonResponse({
				total_subscribers: subscribers.length,
				page: 1,
				total_pages: 1,
				subscribers,
			})
		}

		if (request.method === 'GET' && isSubscriberTagsPath(url.pathname)) {
			return jsonResponse({ tags: [defaultTag] })
		}

		if (request.method === 'POST' && isFormSubscribePath(url.pathname)) {
			const subscription = createSubscription({
				sourceType: 'form',
				sourceId: url.pathname.split('/')[3] ?? 'unknown-form',
				body,
			})
			return jsonResponse({ subscription })
		}

		if (request.method === 'POST' && isTagSubscribePath(url.pathname)) {
			const subscription = createSubscription({
				sourceType: 'tag',
				sourceId: url.pathname.split('/')[3] ?? 'unknown-tag',
				body,
			})
			return jsonResponse({ subscription })
		}

		return jsonResponse(
			{
				error: `Unhandled mock request: ${request.method} ${url.pathname}`,
			},
			404,
		)
	},
}

function isSubscriberTagsPath(pathname: string) {
	return /^\/v3\/subscribers\/[^/]+\/tags$/.test(pathname)
}

function isFormSubscribePath(pathname: string) {
	return /^\/v3\/forms\/[^/]+\/subscribe$/.test(pathname)
}

function isTagSubscribePath(pathname: string) {
	return /^\/v3\/tags\/[^/]+\/subscribe$/.test(pathname)
}

function normalizePayload(body: string | null) {
	if (!body) return {}
	try {
		const parsed = JSON.parse(body) as Record<string, unknown>
		return parsed
	} catch {
		return {}
	}
}

function createSubscription({
	sourceType,
	sourceId,
	body,
}: {
	sourceType: 'form' | 'tag'
	sourceId: string
	body: string | null
}) {
	const payload = normalizePayload(body)
	const email =
		typeof payload.email === 'string' ? payload.email : 'unknown@example.com'
	const firstName =
		typeof payload.first_name === 'string' ? payload.first_name : 'Unknown'
	const fields =
		payload.fields && typeof payload.fields === 'object'
			? (payload.fields as Record<string, string | null>)
			: {}

	const existing = mockState.subscriptionsByEmail.get(email)
	const createdAt = new Date().toISOString()
	const subscriber: KitSubscriber = existing
		? {
				...existing.subscriber,
				first_name: firstName,
				fields,
				state: 'active',
			}
		: {
				id: mockState.nextSubscriberId++,
				first_name: firstName,
				email_address: email,
				state: 'active',
				created_at: createdAt,
				fields,
			}

	const subscription: SubscriptionRecord = {
		id: mockState.nextSubscriptionId++,
		sourceType,
		sourceId,
		createdAt,
		subscriber,
	}
	mockState.subscriptionsByEmail.set(email, subscription)

	return {
		id: subscription.id,
		state: 'active',
		created_at: createdAt,
		source: 'mock-kit-worker',
		referrer: null,
		subscribable_id: sourceId,
		subscribable_type: sourceType,
		subscriber,
	}
}

function recordRequest({
	method,
	path,
	query,
	body,
}: {
	method: string
	path: string
	query: string
	body: string | null
}) {
	mockState.requestLog.push({
		id: mockState.nextRequestLogId++,
		method,
		path,
		query,
		body,
		createdAt: new Date().toISOString(),
	})
	if (mockState.requestLog.length > 200) {
		mockState.requestLog.shift()
	}
}

function resetState() {
	mockState.subscriptionsByEmail.clear()
	mockState.requestLog = []
	mockState.nextRequestLogId = 1
}

async function readRequestBody(request: Request) {
	if (request.method === 'GET' || request.method === 'HEAD') return null
	try {
		return await request.clone().text()
	} catch {
		return null
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
	const rows = [...mockState.requestLog]
		.reverse()
		.slice(0, 50)
		.map((entry) => {
			const body = entry.body ? escapeHtml(entry.body.slice(0, 200)) : '—'
			return `<tr>
      <td>${entry.id}</td>
      <td>${escapeHtml(entry.method)}</td>
      <td>${escapeHtml(entry.path + entry.query)}</td>
      <td><code>${body}</code></td>
      <td>${escapeHtml(entry.createdAt)}</td>
    </tr>`
		})
		.join('\n')

	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kit Mock Dashboard</title>
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
        max-width: 1100px;
        margin: 0 auto;
      }
      h1 {
        margin: 0 0 0.5rem;
      }
      .summary {
        color: var(--muted);
        margin-bottom: 1rem;
      }
      .toolbar {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
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
        vertical-align: top;
      }
      code {
        white-space: pre-wrap;
        word-break: break-word;
      }
      @media (max-width: 800px) {
        table, thead, tbody, tr, th, td {
          display: block;
        }
        thead {
          display: none;
        }
        tr {
          border-bottom: 1px solid var(--border);
          padding: 0.5rem 0;
        }
        td {
          border: none;
          padding: 0.25rem 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="layout">
      <h1>Kit Mock Dashboard</h1>
      <p class="summary">
        Tracks recent requests handled by this mock worker. Supports light/dark themes and responsive layouts.
      </p>
      <div class="toolbar">
        <button id="refresh" type="button">Refresh</button>
        <button id="reset" type="button">Reset state</button>
      </div>
      <table aria-label="mock request log">
        <thead>
          <tr>
            <th>ID</th>
            <th>Method</th>
            <th>Path</th>
            <th>Body</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5">No requests yet.</td></tr>'}
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
