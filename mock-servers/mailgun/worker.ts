type MockEmail = {
	id: number
	to: string
	from: string
	subject: string
	text: string
	html: string
	verificationCode: string | null
	verificationUrl: string | null
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
			const filteredEmails = filterEmails({
				to: url.searchParams.get('to')?.trim() ?? '',
				subject: url.searchParams.get('subject')?.trim() ?? '',
			})
			const limit = Number.parseInt(url.searchParams.get('limit') ?? '500', 10)
			const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 500
			return jsonResponse({
				emails: [...filteredEmails].reverse().slice(0, boundedLimit),
			})
		}

		if (url.pathname === '/__mocks/emails/latest') {
			const filteredEmails = filterEmails({
				to: url.searchParams.get('to')?.trim() ?? '',
				subject: url.searchParams.get('subject')?.trim() ?? '',
			})
			const latestEmail = filteredEmails[filteredEmails.length - 1]
			if (!latestEmail) {
				return jsonResponse({ error: 'No matching emails found' }, 404)
			}
			return jsonResponse({ email: latestEmail })
		}

		if (/^\/__mocks\/emails\/\d+$/.test(url.pathname)) {
			const emailId = Number.parseInt(url.pathname.split('/').pop() ?? '', 10)
			const email = emails.find((entry) => entry.id === emailId)
			if (!email) {
				return jsonResponse({ error: `Email ${emailId} not found` }, 404)
			}
			return jsonResponse({ email })
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
	const verificationCode = extractVerificationCode(text, html)
	const verificationUrl = extractVerificationUrl(text, html)
	return {
		id: nextEmailId++,
		to,
		from,
		subject,
		text,
		html,
		verificationCode,
		verificationUrl,
		createdAt: new Date().toISOString(),
	}
}

function filterEmails({
	to,
	subject,
}: {
	to: string
	subject: string
}) {
	const normalizedTo = to.toLowerCase()
	const normalizedSubject = subject.toLowerCase()
	return emails.filter((email) => {
		if (normalizedTo && !email.to.toLowerCase().includes(normalizedTo)) {
			return false
		}
		if (
			normalizedSubject &&
			!email.subject.toLowerCase().includes(normalizedSubject)
		) {
			return false
		}
		return true
	})
}

function extractVerificationCode(text: string, html: string) {
	const textMatch = /Verification code:\s*([A-Za-z0-9-]+)/i.exec(text)
	if (textMatch?.[1]) return textMatch[1].trim()
	const htmlMatch = /Verification code<\/[^>]+>\s*<[^>]+>\s*([A-Za-z0-9-]+)\s*</i.exec(
		html,
	)
	return htmlMatch?.[1]?.trim() ?? null
}

function extractVerificationUrl(text: string, html: string) {
	const textMatch = /Or click this link:\s*(https?:\/\/\S+)/i.exec(text)
	if (textMatch?.[1]) return textMatch[1].trim()
	const htmlMatch = /href="(https?:\/\/[^"]+)"/i.exec(html)
	return htmlMatch?.[1]?.trim() ?? null
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
	const rows = [...emails].reverse().slice(0, 50)
	const latestVerificationEmail = [...emails]
		.reverse()
		.find((email) => email.verificationCode || email.verificationUrl)
	const selectedEmail = rows[0]
	const selectedEmailPanel = selectedEmail
		? `<section class="details">
        <h2>Email #${selectedEmail.id}</h2>
        <dl class="detail-grid">
          <dt>To</dt><dd>${escapeHtml(selectedEmail.to)}</dd>
          <dt>From</dt><dd>${escapeHtml(selectedEmail.from)}</dd>
          <dt>Subject</dt><dd>${escapeHtml(selectedEmail.subject)}</dd>
          <dt>Verification code</dt><dd>${selectedEmail.verificationCode ? `<code>${escapeHtml(selectedEmail.verificationCode)}</code>` : '—'}</dd>
          <dt>Verification URL</dt><dd>${selectedEmail.verificationUrl ? `<a href="${escapeHtml(selectedEmail.verificationUrl)}">${escapeHtml(selectedEmail.verificationUrl)}</a>` : '—'}</dd>
        </dl>
        <h3>Text body</h3>
        <pre>${escapeHtml(selectedEmail.text || '(empty)')}</pre>
      </section>`
		: ''
	const latestVerificationPanel = latestVerificationEmail
		? `<section class="verification-summary">
        <h2>Latest verification email</h2>
        <p><strong>To:</strong> ${escapeHtml(latestVerificationEmail.to)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(latestVerificationEmail.subject)}</p>
        <p><strong>Code:</strong> ${latestVerificationEmail.verificationCode ? `<code>${escapeHtml(latestVerificationEmail.verificationCode)}</code>` : '—'}</p>
        <p><strong>URL:</strong> ${latestVerificationEmail.verificationUrl ? `<a href="${escapeHtml(latestVerificationEmail.verificationUrl)}">${escapeHtml(latestVerificationEmail.verificationUrl)}</a>` : '—'}</p>
      </section>`
		: '<section class="verification-summary"><h2>Latest verification email</h2><p>No verification emails captured yet.</p></section>'

	const emailApiExamples = `curl -sS http://127.0.0.1:8793/__mocks/emails/latest?to=user@example.com
curl -sS http://127.0.0.1:8793/__mocks/emails?subject=verification&limit=5`

	const rowsMarkup = rows
		.map(
			(email) => `<tr>
      <td>${email.id}</td>
      <td>${escapeHtml(email.to)}</td>
      <td>${escapeHtml(email.subject)}</td>
      <td>${email.verificationCode ? `<code>${escapeHtml(email.verificationCode)}</code>` : '—'}</td>
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
      .verification-summary {
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        margin: 1rem 0;
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
      .detail-grid {
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: 0.4rem 0.8rem;
      }
      .detail-grid dt {
        color: var(--muted);
      }
      pre {
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        padding: 0.75rem;
        max-height: 20rem;
        overflow: auto;
        white-space: pre-wrap;
      }
      .api-help {
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        margin: 1rem 0;
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
        Captured emails and request activity for the Mailgun mock worker. Use the
        JSON endpoints to power Playwright helpers and quickly locate login/reset codes.
      </p>
      ${latestVerificationPanel}
      <div class="toolbar">
        <button id="refresh" type="button">Refresh</button>
        <button id="reset" type="button">Reset state</button>
      </div>
      <section class="api-help">
        <h2>Useful API endpoints</h2>
        <ul>
          <li><code>/__mocks/emails/latest?to=&lt;recipient&gt;</code></li>
          <li><code>/__mocks/emails?to=&lt;recipient&gt;&amp;subject=verification</code></li>
          <li><code>/__mocks/emails/&lt;id&gt;</code></li>
        </ul>
        <pre>${escapeHtml(emailApiExamples)}</pre>
      </section>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>To</th>
            <th>Subject</th>
            <th>Code</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${rowsMarkup || '<tr><td colspan="5">No emails captured yet.</td></tr>'}
        </tbody>
      </table>
      ${selectedEmailPanel}
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
