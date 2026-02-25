type EpisodeStatus = 'published' | 'scheduled' | 'draft'

type TransistorEpisodeData = {
	id: string
	type: 'episode'
	attributes: {
		number: number | null
		season: number
		title: string
		summary: string
		description: string
		keywords: string
		duration?: number
		status: EpisodeStatus
		image_url: string
		media_url: string
		share_url: string
		embed_html: string
		embed_html_dark: string
		published_at: string
		updated_at: string
		audio_processing: boolean
		transcript_url?: string | null
		transcripts?: string[]
	}
}

type RequestLogEntry = {
	id: number
	method: string
	path: string
	query: string
	createdAt: string
}

const requestLog: Array<RequestLogEntry> = []
let nextRequestId = 1

const uploadedAudio = new Map<string, number>()
const episodes: Array<TransistorEpisodeData> = []

seedEpisodes()

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
				service: 'transistor',
				description: 'Mock Transistor API worker',
				dashboard: '/__mocks',
				themeSupport: ['light', 'dark'],
				responsive: true,
				requestCount: requestLog.length,
				episodeCount: episodes.length,
			})
		}

		if (url.pathname === '/__mocks/requests') {
			return jsonResponse({ requests: [...requestLog].reverse() })
		}

		if (url.pathname === '/__mocks/reset' && request.method === 'POST') {
			requestLog.length = 0
			nextRequestId = 1
			uploadedAudio.clear()
			episodes.length = 0
			seedEpisodes()
			return jsonResponse({ success: true })
		}

		if (url.pathname === '/__mocks') {
			return htmlResponse(renderDashboard())
		}

		if (
			request.method === 'GET' &&
			url.pathname === '/v1/episodes/authorize_upload'
		) {
			const uploadId = crypto.randomUUID()
			const uploadUrl = new URL(`/uploads/${uploadId}`, url.origin)
			return jsonResponse({
				data: {
					attributes: {
						upload_url: uploadUrl.toString(),
						audio_url: `https://audio.example.com/mock/${uploadId}.mp3`,
						content_type: 'audio/mpeg',
					},
				},
			})
		}

		if (request.method === 'PUT' && /^\/uploads\/[^/]+$/.test(url.pathname)) {
			const uploadId = url.pathname.split('/')[2]
			if (!uploadId) return jsonResponse({ error: 'missing upload id' }, 400)
			const body = await request.arrayBuffer()
			uploadedAudio.set(uploadId, body.byteLength)
			return jsonResponse({ success: true, bytes: body.byteLength })
		}

		if (request.method === 'POST' && url.pathname === '/v1/episodes') {
			const json = (await request.json()) as {
				episode?: {
					show_id?: string
					season?: number
					number?: number
					audio_url?: string
					title?: string
					summary?: string
					description?: string
					keywords?: string
					status?: EpisodeStatus
					image_url?: string
					transcript_text?: string
				}
			}
			const payload = json.episode
			if (!payload?.show_id) {
				return jsonResponse(
					{ errors: [{ title: 'episode.show_id is required' }] },
					422,
				)
			}
			const id = crypto.randomUUID()
			const now = new Date().toISOString()
			const number = getNextEpisodeNumber()
			const season = payload.season ?? getCurrentSeason()
			const title = payload.title ?? `Mock transistor episode ${number}`
			const episode = createEpisode({
				id,
				season,
				number: payload.number ?? number,
				title,
				summary: payload.summary ?? '',
				description: payload.description ?? '',
				keywords: payload.keywords ?? '',
				status: payload.status ?? 'draft',
				imageUrl:
					payload.image_url ??
					`https://images.example.com/transistor/${id}.png`,
				mediaUrl:
					payload.audio_url ?? `https://audio.example.com/mock/${id}.mp3`,
				publishedAt: now,
				updatedAt: now,
			})
			episodes.push(episode)
			return jsonResponse({ data: episode }, 201)
		}

		if (request.method === 'GET' && url.pathname === '/v1/episodes') {
			const per = Math.max(1, Number(url.searchParams.get('pagination[per]') ?? 100))
			const page = Math.max(1, Number(url.searchParams.get('pagination[page]') ?? 1))
			const order = url.searchParams.get('order')
			const sorted = [...episodes].sort((a, b) => {
				const bySeason = a.attributes.season - b.attributes.season
				if (bySeason !== 0) return bySeason
				return (a.attributes.number ?? 0) - (b.attributes.number ?? 0)
			})
			if (order === 'desc') sorted.reverse()
			const totalCount = sorted.length
			const totalPages = Math.max(1, Math.ceil(totalCount / per))
			const offset = (page - 1) * per
			const pageItems = sorted.slice(offset, offset + per)
			return jsonResponse({
				data: pageItems,
				meta: {
					currentPage: page,
					totalPages,
					totalCount,
				},
			})
		}

		if (
			request.method === 'PATCH' &&
			/^\/v1\/episodes\/[^/]+\/publish$/.test(url.pathname)
		) {
			const episodeId = url.pathname.split('/')[3]
			const episode = episodes.find((item) => item.id === episodeId)
			if (!episode) {
				return jsonResponse({ errors: [{ title: 'Episode not found' }] }, 404)
			}
			episode.attributes.status = 'published'
			episode.attributes.updated_at = new Date().toISOString()
			return jsonResponse({ data: episode })
		}

		if (request.method === 'PATCH' && /^\/v1\/episodes\/[^/]+$/.test(url.pathname)) {
			const episodeId = url.pathname.split('/')[3]
			const episode = episodes.find((item) => item.id === episodeId)
			if (!episode) {
				return jsonResponse({ errors: [{ title: 'Episode not found' }] }, 404)
			}
			const json = (await request.json()) as {
				episode?: Partial<TransistorEpisodeData['attributes']>
			}
			if (json.episode) {
				Object.assign(episode.attributes, json.episode)
			}
			episode.attributes.updated_at = new Date().toISOString()
			return jsonResponse({ data: episode })
		}

		return jsonResponse(
			{
				error: `Unhandled mock request: ${request.method} ${url.pathname}`,
			},
			404,
		)
	},
}

function createEpisode({
	id,
	season,
	number,
	title,
	summary,
	description,
	keywords,
	status,
	imageUrl,
	mediaUrl,
	publishedAt,
	updatedAt,
}: {
	id: string
	season: number
	number: number
	title: string
	summary: string
	description: string
	keywords: string
	status: EpisodeStatus
	imageUrl: string
	mediaUrl: string
	publishedAt: string
	updatedAt: string
}) {
	return {
		id,
		type: 'episode' as const,
		attributes: {
			number,
			season,
			title,
			summary,
			description,
			keywords,
			duration: 600 + number * 10,
			status,
			image_url: imageUrl,
			media_url: mediaUrl,
			share_url: `https://share.example.com/${id}`,
			embed_html: `<iframe src="https://share.example.com/e/${id}"></iframe>`,
			embed_html_dark: `<iframe src="https://share.example.com/e/${id}/dark"></iframe>`,
			published_at: publishedAt,
			updated_at: updatedAt,
			audio_processing: false,
			transcript_url: null,
			transcripts: [],
		},
	}
}

function seedEpisodes() {
	for (let season = 1; season <= 2; season++) {
		for (let number = 1; number <= 4; number++) {
			const id = `season-${season}-episode-${number}`
			const publishedAt = new Date(
				Date.UTC(2025, season - 1, number, 9, 0, 0),
			).toISOString()
			const updatedAt = new Date(
				Date.UTC(2025, season - 1, number, 10, 0, 0),
			).toISOString()
			episodes.push(
				createEpisode({
					id,
					season,
					number,
					title: `Mock Transistor Episode ${season}.${number}`,
					summary: `Summary for episode ${season}.${number}`,
					description: `Description for episode ${season}.${number}`,
					keywords: `mock,season-${season}`,
					status: 'published',
					imageUrl: `https://images.example.com/transistor/${id}.png`,
					mediaUrl: `https://audio.example.com/mock/${id}.mp3`,
					publishedAt,
					updatedAt,
				}),
			)
		}
	}
}

function getCurrentSeason() {
	if (episodes.length === 0) return 1
	return Math.max(...episodes.map((episode) => episode.attributes.season))
}

function getNextEpisodeNumber() {
	if (episodes.length === 0) return 1
	return Math.max(...episodes.map((episode) => episode.attributes.number ?? 0)) + 1
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
    <title>Transistor Mock Dashboard</title>
    <style>
      :root { color-scheme: light dark; --bg: #fff; --fg: #0f172a; --muted: #64748b; --border: #cbd5e1; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #0b1120; --fg: #e2e8f0; --muted: #94a3b8; --border: #334155; }
      }
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
      <h1>Transistor Mock Dashboard</h1>
      <p class="summary">Captured requests and in-memory state for local development.</p>
      <p class="summary">Episodes: ${episodes.length} · Uploaded files: ${uploadedAudio.size}</p>
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
