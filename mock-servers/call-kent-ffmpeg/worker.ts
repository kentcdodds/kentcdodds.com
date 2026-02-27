type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
}

const requestLog: Array<RequestLogEntry> = []
let nextRequestId = 1

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		recordRequest({
			method: request.method,
			path: url.pathname,
			query: url.search,
		})

		if (url.pathname === '/__mocks/meta') {
			return jsonResponse({
				service: 'call-kent-ffmpeg',
				description: 'Mock Call Kent ffmpeg container endpoint',
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

		if (url.pathname === '/episode-audio' && request.method === 'POST') {
			return handleEpisodeAudioRequest(request)
		}

		return jsonResponse(
			{
				error: `Unhandled mock request: ${request.method} ${url.pathname}`,
			},
			404,
		)
	},
}

async function handleEpisodeAudioRequest(request: Request) {
	const formData = await request.formData()
	const callAudio = formData.get('callAudio')
	const responseAudio = formData.get('responseAudio')

	if (!(callAudio instanceof File) || !(responseAudio instanceof File)) {
		return jsonResponse(
			{
				error: 'Expected multipart files "callAudio" and "responseAudio".',
			},
			400,
		)
	}

	const callBytes = new Uint8Array(await callAudio.arrayBuffer())
	const responseBytes = new Uint8Array(await responseAudio.arrayBuffer())
	const callerMp3 = createMockMp3Segment('caller', callBytes)
	const responderMp3 = createMockMp3Segment('response', responseBytes)
	const episodeMp3 = concatenateSegments([callerMp3, responderMp3])

	return jsonResponse({
		callerMp3Base64: uint8ToBase64(callerMp3),
		responseMp3Base64: uint8ToBase64(responderMp3),
		episodeMp3Base64: uint8ToBase64(episodeMp3),
	})
}

function createMockMp3Segment(label: string, source: Uint8Array) {
	const asciiEncoder = new TextEncoder()
	const prefix = asciiEncoder.encode(`MOCK-${label.toUpperCase()}-`)
	const body = source.slice(0, Math.min(source.byteLength, 256))
	return concatenateSegments([prefix, body])
}

function concatenateSegments(segments: Array<Uint8Array>) {
	const totalLength = segments.reduce((sum, segment) => {
		return sum + segment.byteLength
	}, 0)
	const merged = new Uint8Array(totalLength)
	let offset = 0
	for (const segment of segments) {
		merged.set(segment, offset)
		offset += segment.byteLength
	}
	return merged
}

function uint8ToBase64(bytes: Uint8Array) {
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return btoa(binary)
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
	if (requestLog.length > 200) requestLog.shift()
}

function jsonResponse(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload, null, 2), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function htmlResponse(html: string) {
	return new Response(html, {
		status: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function renderDashboard() {
	const rows = [...requestLog]
		.reverse()
		.map((entry) => {
			return `<tr><td>${entry.id}</td><td>${entry.createdAt}</td><td>${entry.method}</td><td>${entry.path}${entry.query}</td></tr>`
		})
		.join('')

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Call Kent ffmpeg mock</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; padding: 1rem; background: Canvas; color: CanvasText; }
    .wrap { max-width: 960px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    th, td { text-align: left; border-bottom: 1px solid color-mix(in oklab, CanvasText 20%, Canvas 80%); padding: 0.45rem; word-break: break-word; }
    code { background: color-mix(in oklab, CanvasText 10%, Canvas 90%); padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    button { border: 1px solid color-mix(in oklab, CanvasText 25%, Canvas 75%); background: transparent; color: inherit; padding: 0.4rem 0.75rem; border-radius: 0.35rem; cursor: pointer; }
    @media (max-width: 640px) {
      table { font-size: 0.78rem; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>Call Kent ffmpeg mock</h1>
    <p>Container-compatible endpoint: <code>POST /episode-audio</code></p>
    <div class="actions">
      <button id="reset">Reset requests</button>
      <a href="/__mocks/requests">Requests JSON</a>
      <a href="/__mocks/meta">Meta JSON</a>
    </div>
    <table>
      <thead>
        <tr><th>ID</th><th>Time</th><th>Method</th><th>Path</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4">No requests yet.</td></tr>'}</tbody>
    </table>
  </main>
  <script>
    document.getElementById('reset')?.addEventListener('click', async () => {
      await fetch('/__mocks/reset', { method: 'POST' })
      window.location.reload()
    })
  </script>
</body>
</html>`
}
