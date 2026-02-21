import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as YAML from 'yaml'
import { chunkText, makeSnippet, normalizeText, sha256 } from './chunk-utils.ts'
import {
	getCloudflareConfig,
	getEmbeddings,
	vectorizeDeleteByIds,
	vectorizeUpsert,
} from './cloudflare.ts'
import { getSemanticSearchIgnoreList, isDocIdIgnored } from './ignore-list.ts'
import { getJsonObject, putJsonObject } from './r2-manifest.ts'

type DocType = 'youtube'
type TranscriptSource = 'manual' | 'auto' | 'none'
type VideoSource = 'playlist' | 'appearances' | 'talks'

type ManifestChunk = {
	id: string
	hash: string
	snippet: string
	chunkIndex: number
	chunkCount: number
	kind?: 'meta' | 'transcript'
	startSeconds?: number
	endSeconds?: number
}

type ManifestDoc = {
	type: DocType
	url: string
	title: string
	sourceUpdatedAt?: string
	transcriptSource: TranscriptSource
	chunks: ManifestChunk[]
}

type Manifest = {
	version: 1
	docs: Record<string, ManifestDoc>
}

type PlaylistVideo = {
	videoId: string
	title: string
	channelTitle?: string
	description?: string
	durationText?: string
	publishedText?: string
	thumbnailUrl?: string
	position?: number
	sources: VideoSource[]
}

type VideoEnrichedData = {
	title?: string
	description: string
	channelTitle?: string
	publishedAt?: string
	transcript: string
	transcriptEvents: TranscriptEvent[]
	transcriptSource: TranscriptSource
}

const DEFAULT_PLAYLIST_ID = 'PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf'

type TranscriptEvent = {
	startMs: number
	durationMs: number
	text: string
}

type YoutubeChunkItem =
	| { kind: 'meta'; body: string }
	| {
			kind: 'transcript'
			body: string
			startSeconds?: number
			endSeconds?: number
	  }

function parseArgs() {
	const args = process.argv.slice(2)
	const get = (name: string) => {
		const i = args.indexOf(name)
		return i >= 0 ? args[i + 1] : undefined
	}

	const explicitVideoInputs: string[] = []
	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg !== '--video' && arg !== '--videos') continue
		const value = args[i + 1]
		if (typeof value === 'string') {
			explicitVideoInputs.push(value)
			i++
		}
	}
	const explicitVideos = explicitVideoInputs
		.flatMap((value) => value.split(','))
		.map((value) => value.trim())
		.filter(Boolean)

	const maxVideosRaw = get('--max-videos')
	const maxVideos =
		typeof maxVideosRaw === 'string' && /^\d+$/.test(maxVideosRaw)
			? Math.max(1, Number(maxVideosRaw))
			: undefined

	return {
		playlist: get('--playlist'),
		manifestKey: get('--manifest-key'),
		maxVideos,
		includeAutoCaptions: parseBoolean(get('--include-auto-captions'), true),
		cacheDir: get('--cache-dir') ?? process.env.YOUTUBE_TRANSCRIPT_CACHE_DIR,
		useCache: parseBoolean(get('--use-cache'), true),
		refreshCache: parseBoolean(get('--refresh-cache'), false),
		// Incremental indexing: skip anything already in the manifest unless reindexing.
		incremental: parseBoolean(get('--incremental'), true),
		reindex: parseBoolean(get('--reindex'), false),
		// Force indexing a specific set of videos (IDs or full YouTube URLs). These
		// will be indexed even if already present in the manifest.
		explicitVideos,
		// If true, ONLY index the explicitly provided videos (ignores discovered list).
		onlyExplicitVideos: parseBoolean(get('--only-videos'), false),
		// When true, remove docs that are no longer discovered in playlist/appearances.
		// Default false to avoid accidental deletions (especially when using --max-videos).
		prune: parseBoolean(get('--prune'), false),
		dryRun: parseBoolean(get('--dry-run'), false),
	}
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
	if (typeof value !== 'string') return defaultValue
	const normalized = value.trim().toLowerCase()
	if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
	if (['0', 'false', 'no', 'off'].includes(normalized)) return false
	return defaultValue
}

function getYouTubeRequestHeaders({
	contentType,
}: { contentType?: string } = {}) {
	const headers: Record<string, string> = {
		'User-Agent':
			process.env.YOUTUBE_USER_AGENT ??
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
		'Accept-Language': 'en-US,en;q=0.9',
	}
	if (contentType) headers['Content-Type'] = contentType
	if (process.env.YOUTUBE_COOKIE) headers.Cookie = process.env.YOUTUBE_COOKIE
	return headers
}

function getDocId(type: DocType, key: string) {
	return `${type}:${key}`
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function truncateForError(value: string, max = 300) {
	if (value.length <= max) return value
	return `${value.slice(0, Math.max(0, max - 3))}...`
}

async function fetchWithRetries(
	url: string,
	{
		init,
		label = 'request',
		maxRetries = 5,
		baseDelayMs = 750,
	}: {
		init?: RequestInit
		label?: string
		maxRetries?: number
		baseDelayMs?: number
	} = {},
) {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const attemptCount = attempt + 1
		try {
			const response = await fetch(url, init)
			if (response.status === 429 && attempt < maxRetries) {
				const retryAfter = Number(response.headers.get('Retry-After') ?? '0')
				const delayMs =
					(retryAfter > 0 ? retryAfter * 1000 : baseDelayMs) * attemptCount
				console.warn(
					`${label}: 429 (attempt ${attemptCount}/${maxRetries + 1}), waiting ${Math.round(delayMs)}ms`,
				)
				await sleep(delayMs)
				continue
			}
			if (response.status >= 500 && attempt < maxRetries) {
				const delayMs = baseDelayMs * attemptCount
				console.warn(
					`${label}: ${response.status} (attempt ${attemptCount}/${maxRetries + 1}), waiting ${Math.round(delayMs)}ms`,
				)
				await sleep(delayMs)
				continue
			}
			if (!response.ok) {
				const text = await response.text().catch(() => '')
				throw new Error(
					`${label} failed: ${response.status} ${response.statusText}${text ? `\n${truncateForError(text)}` : ''}`,
				)
			}
			return response
		} catch (error) {
			if (attempt >= maxRetries) throw error
			const delayMs = baseDelayMs * attemptCount
			console.warn(
				`${label}: network/error (attempt ${attemptCount}/${maxRetries + 1}), waiting ${Math.round(delayMs)}ms`,
			)
			await sleep(delayMs)
		}
	}
	throw new Error(`${label} failed after retries`)
}

async function fetchTextWithRetries(
	url: string,
	options?: Parameters<typeof fetchWithRetries>[1],
) {
	const res = await fetchWithRetries(url, options)
	return await res.text()
}

async function fetchJsonWithRetries<T>(
	url: string,
	options?: Parameters<typeof fetchWithRetries>[1],
) {
	const res = await fetchWithRetries(url, options)
	return (await res.json()) as T
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		return undefined
	return value as Record<string, unknown>
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : []
}

function asString(value: unknown) {
	return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getText(value: unknown): string | undefined {
	if (!value) return undefined
	if (typeof value === 'string') return value
	const record = asRecord(value)
	if (!record) return undefined
	const simple = asString(record.simpleText)
	if (simple) return simple
	const runs = asArray(record.runs)
	const text = runs
		.map((run) => asString(asRecord(run)?.text))
		.filter((x): x is string => Boolean(x))
		.join('')
		.trim()
	return text || undefined
}

function collectObjectsByKey(
	root: unknown,
	key: string,
): Array<Record<string, unknown>> {
	const result: Array<Record<string, unknown>> = []
	const stack: unknown[] = [root]
	while (stack.length) {
		const node = stack.pop()
		if (!node || typeof node !== 'object') continue
		if (Array.isArray(node)) {
			for (const item of node) stack.push(item)
			continue
		}
		const record = node as Record<string, unknown>
		const candidate = asRecord(record[key])
		if (candidate) result.push(candidate)
		for (const value of Object.values(record)) stack.push(value)
	}
	return result
}

function getPlaylistId(input: string | undefined) {
	if (!input) return null
	const trimmed = input.trim()
	if (!trimmed) return null
	if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed
	try {
		const url = new URL(trimmed)
		const list = url.searchParams.get('list')
		return list && /^[A-Za-z0-9_-]{10,}$/.test(list) ? list : null
	} catch {
		return null
	}
}

function extractYoutubeVideoId(rawUrl: string) {
	let parsed: URL
	try {
		parsed = new URL(rawUrl)
	} catch {
		return null
	}
	const host = parsed.hostname.toLowerCase()
	const hostWithoutWww = host.replace(/^www\./, '')
	const hostWithoutMobile = hostWithoutWww.replace(/^m\./, '')
	const isYoutubeHost =
		hostWithoutMobile === 'youtube.com' ||
		hostWithoutMobile.endsWith('.youtube.com')
	const isYoutubeNoCookieHost =
		hostWithoutMobile === 'youtube-nocookie.com' ||
		hostWithoutMobile.endsWith('.youtube-nocookie.com')

	if (hostWithoutMobile === 'youtu.be') {
		const candidate = (
			parsed.pathname.split('/').filter(Boolean)[0] ?? ''
		).trim()
		return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null
	}

	if (!isYoutubeHost && !isYoutubeNoCookieHost) return null

	if (parsed.pathname === '/watch') {
		const candidate = (parsed.searchParams.get('v') ?? '').trim()
		return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null
	}

	const segments = parsed.pathname.split('/').filter(Boolean)
	const startsWithVideoIdPath =
		segments[0] === 'shorts' ||
		segments[0] === 'embed' ||
		segments[0] === 'live' ||
		segments[0] === 'v'
	if (!startsWithVideoIdPath) return null
	const candidate = (segments[1] ?? '').trim()
	return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null
}

function extractMarkdownLinks(source: string) {
	const links: Array<{ text: string; url: string }> = []
	const linkRegex = /\[(?<text>[^\]]+)\]\((?<url>https?:\/\/[^)\s]+)\)/g
	for (const match of source.matchAll(linkRegex)) {
		const text = (match.groups?.text ?? '').trim()
		const url = (match.groups?.url ?? '').trim()
		if (!url) continue
		links.push({ text, url })
	}
	return links
}

async function fetchAppearancesYouTubeVideos() {
	const appearancesPath = path.join(
		process.cwd(),
		'content',
		'pages',
		'appearances.mdx',
	)
	let appearancesSource = ''
	try {
		appearancesSource = await fs.readFile(appearancesPath, 'utf8')
	} catch (error: unknown) {
		const code = (error as { code?: string })?.code
		if (code === 'ENOENT') return []
		throw error
	}

	const byVideoId = new Map<string, PlaylistVideo>()
	for (const link of extractMarkdownLinks(appearancesSource)) {
		const videoId = extractYoutubeVideoId(link.url)
		if (!videoId) continue

		const fallbackTitle = `YouTube video ${videoId}`
		const nextTitle = link.text || fallbackTitle
		const existing = byVideoId.get(videoId)
		if (!existing) {
			byVideoId.set(videoId, {
				videoId,
				title: nextTitle,
				sources: ['appearances'],
			})
			continue
		}
		if (existing.title === fallbackTitle && link.text) {
			existing.title = link.text
		}
	}
	return [...byVideoId.values()]
}

async function fetchTalksYouTubeVideos() {
	const talksPath = path.join(process.cwd(), 'content', 'data', 'talks.yml')
	let raw = ''
	try {
		raw = await fs.readFile(talksPath, 'utf8')
	} catch (error: unknown) {
		const code = (error as { code?: string })?.code
		if (code === 'ENOENT') return []
		throw error
	}

	let parsed: unknown
	try {
		parsed = YAML.parse(raw)
	} catch {
		// If talks.yml is malformed, don't fail the entire YouTube indexing run.
		return []
	}

	if (!Array.isArray(parsed)) return []

	const byVideoId = new Map<string, PlaylistVideo>()
	for (const talk of parsed) {
		const talkRecord = asRecord(talk)
		if (!talkRecord) continue
		const talkTitle = asString(talkRecord.title) ?? 'Talk'
		const deliveries = asArray(talkRecord.deliveries)
		for (const delivery of deliveries) {
			const deliveryRecord = asRecord(delivery)
			if (!deliveryRecord) continue
			const recording = asString(deliveryRecord.recording)
			if (!recording) continue
			const videoId = extractYoutubeVideoId(recording)
			if (!videoId) continue

			if (!byVideoId.has(videoId)) {
				byVideoId.set(videoId, {
					videoId,
					title: talkTitle,
					sources: ['talks'],
				})
			}
		}
	}

	return [...byVideoId.values()]
}

function mergeVideos({
	playlistVideos,
	appearancesVideos,
	talksVideos,
	maxVideos,
}: {
	playlistVideos: PlaylistVideo[]
	appearancesVideos: PlaylistVideo[]
	talksVideos: PlaylistVideo[]
	maxVideos?: number
}) {
	const byVideoId = new Map<string, PlaylistVideo>()
	const upsert = (video: PlaylistVideo) => {
		const existing = byVideoId.get(video.videoId)
		if (!existing) {
			byVideoId.set(video.videoId, {
				...video,
				sources: [...video.sources],
			})
			return
		}

		existing.sources = [...new Set([...existing.sources, ...video.sources])]
		const fallbackTitle = `YouTube video ${existing.videoId}`
		if (
			(!existing.title || existing.title === fallbackTitle) &&
			video.title &&
			video.title !== fallbackTitle
		) {
			existing.title = video.title
		}
		existing.channelTitle = existing.channelTitle ?? video.channelTitle
		existing.description = existing.description ?? video.description
		existing.durationText = existing.durationText ?? video.durationText
		existing.publishedText = existing.publishedText ?? video.publishedText
		existing.thumbnailUrl = existing.thumbnailUrl ?? video.thumbnailUrl
		existing.position = existing.position ?? video.position
	}

	for (const video of playlistVideos) upsert(video)
	for (const video of appearancesVideos) upsert(video)
	for (const video of talksVideos) upsert(video)

	const sorted = [...byVideoId.values()].sort((a, b) => {
		const left = a.position ?? Number.MAX_SAFE_INTEGER
		const right = b.position ?? Number.MAX_SAFE_INTEGER
		if (left !== right) return left - right
		return a.videoId.localeCompare(b.videoId)
	})

	if (!maxVideos) return sorted
	return sorted.slice(0, Math.max(1, maxVideos))
}

function parseInnertubeConfig(html: string) {
	const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"(?<key>[^"]+)"/)
	const clientVersionMatch = html.match(
		/"INNERTUBE_CLIENT_VERSION":"(?<version>[^"]+)"/,
	)
	const visitorDataMatch = html.match(/"VISITOR_DATA":"(?<visitor>[^"]+)"/)
	const apiKey = apiKeyMatch?.groups?.key
	const clientVersion = clientVersionMatch?.groups?.version
	const visitorData = visitorDataMatch?.groups?.visitor
	if (!apiKey || !clientVersion) {
		throw new Error(
			'Could not parse YouTube Innertube config from playlist page',
		)
	}
	return { apiKey, clientVersion, visitorData }
}

type YouTubeBrowseConfig = {
	apiKey: string
	context: Record<string, unknown>
}

function parseSignatureTimestamp(html: string) {
	const fromSts = html.match(/"STS":(?<sts>\d+)/)?.groups?.sts
	const fromSignatureTimestamp = html.match(/"signatureTimestamp":(?<sts>\d+)/)
		?.groups?.sts
	const raw = fromSts ?? fromSignatureTimestamp
	if (!raw) return null
	const n = Number(raw)
	return Number.isFinite(n) && n > 0 ? n : null
}

async function fetchYouTubeSignatureTimestamp(videoId: string) {
	const watchUrl = new URL('https://www.youtube.com/watch')
	watchUrl.searchParams.set('v', videoId)
	watchUrl.searchParams.set('hl', 'en')
	const html = await fetchTextWithRetries(watchUrl.toString(), {
		label: `youtube watch html (sts) ${videoId}`,
		init: { headers: getYouTubeRequestHeaders() },
	})
	const sts = parseSignatureTimestamp(html)
	if (!sts) {
		throw new Error(
			`Could not parse YouTube signatureTimestamp (STS) from watch page for ${videoId}`,
		)
	}
	return sts
}

async function getYouTubeBrowseConfig(
	playlistId: string,
): Promise<YouTubeBrowseConfig> {
	const playlistUrl = new URL('https://www.youtube.com/playlist')
	playlistUrl.searchParams.set('list', playlistId)
	playlistUrl.searchParams.set('hl', 'en')
	const html = await fetchTextWithRetries(playlistUrl.toString(), {
		label: 'youtube playlist html',
		init: {
			headers: getYouTubeRequestHeaders(),
		},
	})
	const { apiKey, clientVersion, visitorData } = parseInnertubeConfig(html)
	const client: Record<string, unknown> = {
		clientName: 'WEB',
		clientVersion,
		hl: 'en',
		gl: 'US',
	}
	if (visitorData) client.visitorData = visitorData
	return {
		apiKey,
		context: {
			client,
		},
	}
}

async function fetchYouTubeBrowseJson({
	config,
	body,
	label,
}: {
	config: YouTubeBrowseConfig
	body: Record<string, unknown>
	label: string
}) {
	const url = `https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(config.apiKey)}`
	return await fetchJsonWithRetries<Record<string, unknown>>(url, {
		label,
		init: {
			method: 'POST',
			headers: getYouTubeRequestHeaders({
				contentType: 'application/json',
			}),
			body: JSON.stringify({
				context: config.context,
				...body,
			}),
		},
	})
}

function parsePlaylistVideo(
	renderer: Record<string, unknown>,
): PlaylistVideo | null {
	const videoId = asString(renderer.videoId)
	if (!videoId) return null
	const isPlayable = renderer.isPlayable
	if (isPlayable === false) return null
	const title = getText(renderer.title) ?? `YouTube video ${videoId}`
	const channelTitle = getText(renderer.shortBylineText)
	const description = getText(renderer.descriptionSnippet)
	const durationText = getText(renderer.lengthText)
	const publishedText = getText(renderer.publishedTimeText)

	const indexText = getText(renderer.index)
	const position =
		typeof indexText === 'string' && /^\d+$/.test(indexText)
			? Number(indexText)
			: asNumber(renderer.index)

	const thumbCandidates = asArray(asRecord(renderer.thumbnail)?.thumbnails)
		.map((thumb) => ({
			url: asString(asRecord(thumb)?.url),
			width: asNumber(asRecord(thumb)?.width) ?? 0,
		}))
		.filter((thumb): thumb is { url: string; width: number } =>
			Boolean(thumb.url),
		)
		.sort((a, b) => b.width - a.width)
	const thumbnailUrl =
		thumbCandidates[0]?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

	return {
		videoId,
		title,
		channelTitle,
		description,
		durationText,
		publishedText,
		thumbnailUrl,
		position,
		sources: ['playlist'],
	}
}

function getPlaylistTitleFromBrowseJson(browseJson: Record<string, unknown>) {
	const metadata = asRecord(browseJson.metadata)
	const playlistMetadata = asRecord(metadata?.playlistMetadataRenderer)
	return getText(playlistMetadata?.title)
}

function getContinuationToken(root: unknown) {
	const continuationItems = collectObjectsByKey(
		root,
		'continuationItemRenderer',
	)
	for (const item of continuationItems) {
		const continuationEndpoint = asRecord(item.continuationEndpoint)
		const continuationCommand = asRecord(
			continuationEndpoint?.continuationCommand,
		)
		const token = asString(continuationCommand?.token)
		if (token) return token
	}
	return null
}

async function fetchPlaylistVideos({
	playlistId,
	maxVideos,
	config,
}: {
	playlistId: string
	maxVideos?: number
	config: YouTubeBrowseConfig
}) {
	const videosById = new Map<string, PlaylistVideo>()

	const initial = await fetchYouTubeBrowseJson({
		config,
		label: 'youtube browse initial',
		body: { browseId: `VL${playlistId}` },
	})
	const playlistTitle =
		getPlaylistTitleFromBrowseJson(initial) ?? `YouTube Playlist ${playlistId}`

	function collectFromPage(page: Record<string, unknown>) {
		const renderers = collectObjectsByKey(page, 'playlistVideoRenderer')
		for (const renderer of renderers) {
			const video = parsePlaylistVideo(renderer)
			if (!video) continue
			if (!videosById.has(video.videoId)) videosById.set(video.videoId, video)
			if (maxVideos && videosById.size >= maxVideos) return
		}
	}

	collectFromPage(initial)
	const seenContinuations = new Set<string>()
	let continuation = getContinuationToken(initial)
	let page = 1

	while (
		continuation &&
		!seenContinuations.has(continuation) &&
		(!maxVideos || videosById.size < maxVideos)
	) {
		seenContinuations.add(continuation)
		page++
		const response = await fetchYouTubeBrowseJson({
			config,
			label: `youtube browse continuation ${page}`,
			body: { continuation },
		})
		collectFromPage(response)
		console.log(
			`Fetched playlist page ${page}; videos discovered: ${videosById.size}`,
		)
		continuation = getContinuationToken(response)
	}

	const videos = [...videosById.values()].sort((a, b) => {
		const left = a.position ?? Number.MAX_SAFE_INTEGER
		const right = b.position ?? Number.MAX_SAFE_INTEGER
		return left - right
	})
	return { playlistTitle, videos }
}

async function fetchYouTubePlayerJson({
	config,
	videoId,
	signatureTimestamp,
}: {
	config: YouTubeBrowseConfig
	videoId: string
	signatureTimestamp?: number | null
}) {
	const url = `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(
		config.apiKey,
	)}`
	const playbackContext =
		typeof signatureTimestamp === 'number' &&
		Number.isFinite(signatureTimestamp)
			? {
					contentPlaybackContext: {
						// YouTube now often requires STS for a playable response (and captionTracks).
						signatureTimestamp,
					},
				}
			: undefined
	return await fetchJsonWithRetries<Record<string, unknown>>(url, {
		label: `youtube player ${videoId}`,
		init: {
			method: 'POST',
			headers: getYouTubeRequestHeaders({
				contentType: 'application/json',
			}),
			body: JSON.stringify({
				context: config.context,
				videoId,
				contentCheckOk: true,
				racyCheckOk: true,
				...(playbackContext ? { playbackContext } : {}),
			}),
		},
	})
}

type CaptionTrack = {
	baseUrl: string
	languageCode?: string
	kind?: string
}

function pickCaptionTrack({
	tracks,
	includeAutoCaptions,
}: {
	tracks: CaptionTrack[]
	includeAutoCaptions: boolean
}): { track: CaptionTrack; source: Exclude<TranscriptSource, 'none'> } | null {
	const normalizedLanguage = 'en'
	const byLanguage = tracks.filter((track) =>
		(track.languageCode ?? '').toLowerCase().startsWith(normalizedLanguage),
	)
	const manualByLanguage = byLanguage.find((track) => track.kind !== 'asr')
	if (manualByLanguage) return { track: manualByLanguage, source: 'manual' }

	if (includeAutoCaptions) {
		const autoByLanguage = byLanguage.find((track) => track.kind === 'asr')
		if (autoByLanguage) return { track: autoByLanguage, source: 'auto' }
	}

	const manualAny = tracks.find((track) => track.kind !== 'asr')
	if (manualAny) return { track: manualAny, source: 'manual' }

	if (includeAutoCaptions) {
		const autoAny = tracks.find((track) => track.kind === 'asr')
		if (autoAny) return { track: autoAny, source: 'auto' }
	}

	return null
}

async function fetchTranscriptFromTrack(track: CaptionTrack, label: string) {
	const transcriptUrl = new URL(track.baseUrl)
	transcriptUrl.searchParams.set('fmt', 'json3')

	type Json3Event = {
		tStartMs?: number
		dDurationMs?: number
		segs?: Array<{ utf8?: string }>
	}
	type Json3 = { events?: Json3Event[] }
	const json = await fetchJsonWithRetries<Json3>(transcriptUrl.toString(), {
		label,
		init: {
			headers: getYouTubeRequestHeaders(),
		},
	})
	const lines: string[] = []
	const transcriptEvents: TranscriptEvent[] = []
	for (const event of json.events ?? []) {
		const startMs =
			typeof event.tStartMs === 'number' && Number.isFinite(event.tStartMs)
				? event.tStartMs
				: 0
		const durationMs =
			typeof event.dDurationMs === 'number' && Number.isFinite(event.dDurationMs)
				? event.dDurationMs
				: 0
		const line = (event.segs ?? [])
			.map((seg) => seg.utf8 ?? '')
			.join('')
			.replace(/\u200B/g, '')
			.trim()
		if (!line) continue
		lines.push(line)
		transcriptEvents.push({ startMs, durationMs, text: line })
	}
	return {
		transcript: normalizeText(lines.join('\n')),
		transcriptEvents,
	}
}

function chunkTranscriptEvents(
	events: TranscriptEvent[],
	{
		targetChars = 3500,
		maxChunkChars = 5500,
	}: { targetChars?: number; maxChunkChars?: number } = {},
) {
	const sorted = [...events].sort((a, b) => a.startMs - b.startMs)
	const chunks: Array<{
		body: string
		startMs: number
		endMs: number
	}> = []

	let currentLines: string[] = []
	let currentLen = 0
	let startMs: number | null = null
	let endMs = 0

	const flush = () => {
		if (!currentLines.length || startMs === null) return
		const body = normalizeText(currentLines.join('\n'))
		if (!body) return
		chunks.push({ body, startMs, endMs })
		currentLines = []
		currentLen = 0
		startMs = null
		endMs = 0
	}

	for (const e of sorted) {
		const line = normalizeText(e.text)
		if (!line) continue

		// If we don't have a current chunk and this line is huge, split it.
		if (!currentLines.length && line.length > maxChunkChars) {
			const eStartMs = Math.max(0, Math.floor(e.startMs))
			const eEndMs = Math.max(
				eStartMs,
				Math.floor(e.startMs + (e.durationMs || 0)),
			)
			for (let i = 0; i < line.length; i += targetChars) {
				const part = line.slice(i, i + targetChars)
				const body = normalizeText(part)
				if (!body) continue
				chunks.push({ body, startMs: eStartMs, endMs: eEndMs })
			}
			continue
		}

		const nextLen = currentLen + (currentLines.length ? 1 : 0) + line.length
		if (currentLines.length && nextLen > targetChars) {
			flush()
		}

		if (startMs === null) startMs = Math.max(0, Math.floor(e.startMs))
		const eventEnd = Math.max(
			0,
			Math.floor(e.startMs + (e.durationMs || 0)),
		)
		endMs = Math.max(endMs, eventEnd)
		currentLines.push(line)
		currentLen = currentLen + (currentLines.length > 1 ? 1 : 0) + line.length
	}

	flush()
	return chunks
}

async function fetchVideoEnrichedData({
	config,
	videoId,
	includeAutoCaptions,
	signatureTimestamp,
}: {
	config: YouTubeBrowseConfig
	videoId: string
	includeAutoCaptions: boolean
	signatureTimestamp?: number | null
}): Promise<VideoEnrichedData> {
	try {
		const player = await fetchYouTubePlayerJson({
			config,
			videoId,
			signatureTimestamp,
		})
		const playabilityStatus = asRecord(player.playabilityStatus)
		const playabilityCode = asString(playabilityStatus?.status)
		const playabilityReason = asString(playabilityStatus?.reason)
		const videoDetails = asRecord(player.videoDetails)
		const microformat = asRecord(
			asRecord(player.microformat)?.playerMicroformatRenderer,
		)

		const title = asString(videoDetails?.title)
		const description = asString(videoDetails?.shortDescription) ?? ''
		const channelTitle = asString(videoDetails?.author)
		const publishedAt =
			asString(microformat?.publishDate) ?? asString(microformat?.uploadDate)

		const tracklist = asRecord(
			asRecord(asRecord(player.captions)?.playerCaptionsTracklistRenderer),
		)
		const tracks = asArray(tracklist?.captionTracks)
			.map((track): CaptionTrack | null => {
				const record = asRecord(track)
				const baseUrl = asString(record?.baseUrl)
				if (!baseUrl) return null
				return {
					baseUrl,
					languageCode: asString(record?.languageCode),
					kind: asString(record?.kind),
				}
			})
			.filter((track): track is CaptionTrack => track !== null)

		const chosen = pickCaptionTrack({
			tracks,
			includeAutoCaptions,
		})
		if (!chosen) {
			// This is the most common "why no transcript?" failure mode.
			if (playabilityCode && playabilityCode !== 'OK') {
				console.warn(
					`YouTube transcript unavailable for ${videoId}: ${playabilityCode}${playabilityReason ? ` (${playabilityReason})` : ''}`,
				)
			}
			return {
				title,
				description,
				channelTitle,
				publishedAt,
				transcript: '',
				transcriptEvents: [],
				transcriptSource: 'none',
			}
		}

		const transcript = await fetchTranscriptFromTrack(
			chosen.track,
			`youtube transcript ${videoId}`,
		)
		return {
			title,
			description,
			channelTitle,
			publishedAt,
			transcript: transcript.transcript,
			transcriptEvents: transcript.transcriptEvents,
			transcriptSource: transcript.transcript ? chosen.source : 'none',
		}
	} catch (error) {
		console.warn(`Failed to fetch transcript/metadata for ${videoId}`, error)
		return {
			title: undefined,
			description: '',
			transcript: '',
			transcriptEvents: [],
			transcriptSource: 'none',
		}
	}
}

type VideoEnrichedDataCacheEntry = {
	cacheVersion: 2
	fetchedAt: string
	videoId: string
	includeAutoCaptions: boolean
	data: VideoEnrichedData
}

function getTranscriptCacheDir(cacheDir?: string) {
	if (cacheDir && cacheDir.trim()) {
		return path.isAbsolute(cacheDir)
			? cacheDir
			: path.join(process.cwd(), cacheDir)
	}
	// Default to OS temp so it’s “throwaway”, but persists between runs.
	return path.join(os.tmpdir(), 'kcd-youtube-transcript-cache')
}

function getTranscriptCachePath({
	cacheDir,
	videoId,
	includeAutoCaptions,
}: {
	cacheDir: string
	videoId: string
	includeAutoCaptions: boolean
}) {
	const suffix = includeAutoCaptions ? 'include-auto' : 'no-auto'
	return path.join(cacheDir, `video-${videoId}-${suffix}.json`)
}

async function readVideoEnrichedDataCache({
	cacheDir,
	videoId,
	includeAutoCaptions,
}: {
	cacheDir: string
	videoId: string
	includeAutoCaptions: boolean
}): Promise<VideoEnrichedData | null> {
	const cachePath = getTranscriptCachePath({
		cacheDir,
		videoId,
		includeAutoCaptions,
	})
	try {
		const raw = await fs.readFile(cachePath, 'utf8')
		const parsed = JSON.parse(raw) as VideoEnrichedDataCacheEntry
		if (parsed?.cacheVersion !== 2) return null
		if (parsed.videoId !== videoId) return null
		if (parsed.includeAutoCaptions !== includeAutoCaptions) return null
		if (!parsed.data || typeof parsed.data !== 'object') return null
		return parsed.data
	} catch (error: unknown) {
		const code = (error as { code?: string })?.code
		if (code === 'ENOENT') return null
		return null
	}
}

async function writeVideoEnrichedDataCache({
	cacheDir,
	videoId,
	includeAutoCaptions,
	data,
}: {
	cacheDir: string
	videoId: string
	includeAutoCaptions: boolean
	data: VideoEnrichedData
}) {
	const cachePath = getTranscriptCachePath({
		cacheDir,
		videoId,
		includeAutoCaptions,
	})
	await fs.mkdir(cacheDir, { recursive: true })
	const entry: VideoEnrichedDataCacheEntry = {
		cacheVersion: 2,
		fetchedAt: new Date().toISOString(),
		videoId,
		includeAutoCaptions,
		data,
	}
	const tmpPath = `${cachePath}.tmp-${process.pid}-${Date.now()}`
	await fs.writeFile(tmpPath, JSON.stringify(entry, null, 2), 'utf8')
	await fs.rename(tmpPath, cachePath)
}

function batch<T>(items: T[], size: number) {
	const result: T[][] = []
	for (let i = 0; i < items.length; i += size) {
		result.push(items.slice(i, i + size))
	}
	return result
}

async function mapWithConcurrency<Item, Result>(
	items: Item[],
	concurrency: number,
	mapper: (item: Item, index: number) => Promise<Result>,
) {
	const results: Result[] = new Array(items.length)
	let nextIndex = 0
	const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
		while (nextIndex < items.length) {
			const current = nextIndex++
			results[current] = await mapper(items[current]!, current)
		}
	})
	await Promise.all(workers)
	return results
}

async function embedItemsSafely({
	accountId,
	apiToken,
	model,
	items,
}: {
	accountId: string
	apiToken: string
	model: string
	items: Array<{
		vectorId: string
		text: string
		metadata: Record<string, unknown>
	}>
}): Promise<
	Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>
> {
	try {
		const embeddings = await getEmbeddings({
			accountId,
			apiToken,
			model,
			texts: items.map((item) => item.text),
		})
		return items.map((item, index) => ({
			id: item.vectorId,
			values: embeddings[index]!,
			metadata: item.metadata,
		}))
	} catch (error) {
		if (items.length <= 1) {
			const item = items[0]
			console.error('Skipping vector due to embedding failure', {
				vectorId: item?.vectorId,
				textLength: item?.text?.length,
			})
			console.error(error)
			return []
		}
		const mid = Math.ceil(items.length / 2)
		const left = await embedItemsSafely({
			accountId,
			apiToken,
			model,
			items: items.slice(0, mid),
		})
		const right = await embedItemsSafely({
			accountId,
			apiToken,
			model,
			items: items.slice(mid),
		})
		return [...left, ...right]
	}
}

async function main() {
	const {
		playlist: playlistArg,
		manifestKey: manifestKeyArg,
		maxVideos,
		includeAutoCaptions,
		cacheDir: cacheDirArg,
		useCache,
		refreshCache,
		incremental,
		reindex,
		explicitVideos: explicitVideoInputs,
		onlyExplicitVideos,
		prune,
		dryRun,
	} = parseArgs()
	const playlistInput =
		playlistArg ??
		process.env.YOUTUBE_PLAYLIST_URL ??
		process.env.YOUTUBE_PLAYLIST_ID ??
		DEFAULT_PLAYLIST_ID
	const playlistId = getPlaylistId(playlistInput)
	if (!playlistId) {
		throw new Error(
			`Invalid YouTube playlist input: "${playlistInput}". Use --playlist with a playlist URL or ID.`,
		)
	}

	const manifestKey = manifestKeyArg ?? `manifests/youtube-${playlistId}.json`
	const browseConfig = await getYouTubeBrowseConfig(playlistId)

	console.log(`Loading playlist ${playlistId}...`)
	const { playlistTitle, videos: playlistVideos } = await fetchPlaylistVideos({
		playlistId,
		config: browseConfig,
	})
	console.log(
		`Playlist "${playlistTitle}" videos discovered: ${playlistVideos.length}`,
	)

	console.log('Loading YouTube links from appearances page...')
	const appearancesVideos = await fetchAppearancesYouTubeVideos()
	console.log(
		`Appearances page YouTube videos discovered: ${appearancesVideos.length}`,
	)
	console.log('Loading YouTube links from talks data...')
	const talksVideos = await fetchTalksYouTubeVideos()
	console.log(`Talks data YouTube videos discovered: ${talksVideos.length}`)
	let videos = mergeVideos({
		playlistVideos,
		appearancesVideos,
		talksVideos,
		maxVideos,
	})

	const explicitVideoIds = new Set<string>()
	for (const input of explicitVideoInputs) {
		const trimmed = input.trim()
		if (!trimmed) continue
		const asId = /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null
		const fromUrl = asId ? null : extractYoutubeVideoId(trimmed)
		const videoId = asId ?? fromUrl
		if (!videoId) {
			throw new Error(
				`Invalid --video/--videos value "${trimmed}". Expected a YouTube video ID or URL.`,
			)
		}
		explicitVideoIds.add(videoId)
	}

	if (onlyExplicitVideos) {
		videos = [...explicitVideoIds].map((videoId) => ({
			videoId,
			title: `YouTube video ${videoId}`,
			sources: ['appearances'] as VideoSource[],
		}))
	} else if (explicitVideoIds.size) {
		const known = new Set(videos.map((v) => v.videoId))
		for (const videoId of explicitVideoIds) {
			if (known.has(videoId)) continue
			videos.push({
				videoId,
				title: `YouTube video ${videoId}`,
				sources: ['appearances'],
			})
		}
	}

	const playlistSourceCount = videos.filter((video) =>
		video.sources.includes('playlist'),
	).length
	const appearancesSourceCount = videos.filter((video) =>
		video.sources.includes('appearances'),
	).length
	const talksSourceCount = videos.filter((video) => video.sources.includes('talks'))
		.length
	console.log(
		`Total unique videos to process: ${videos.length} (playlist: ${playlistSourceCount}, appearances: ${appearancesSourceCount}, talks: ${talksSourceCount})${maxVideos ? `, capped by --max-videos=${maxVideos}` : ''}`,
	)
	if (explicitVideoIds.size) {
		console.log(
			`Explicit videos requested: ${explicitVideoIds.size}${onlyExplicitVideos ? ' (only)' : ''}`,
		)
	}

	if (prune && maxVideos) {
		throw new Error(
			'Refusing to --prune when --max-videos is set (would risk deleting docs you did not discover).',
		)
	}

	// Load the existing manifest early so incremental runs can skip already-indexed
	// videos (avoids talking to YouTube for old content).
	const r2Bucket = process.env.R2_BUCKET ?? 'kcd-semantic-search'
	const manifest = (await getJsonObject<Manifest>({
		bucket: r2Bucket,
		key: manifestKey,
	})) ?? {
		version: 1,
		docs: {},
	}

	const ignoreList = await getSemanticSearchIgnoreList({ bucket: r2Bucket })
	const isIgnoredVideoId = (videoId: string) =>
		isDocIdIgnored({
			docId: getDocId('youtube', videoId),
			ignoreList,
		})
	const ignoredVideos = videos.filter((video) =>
		isIgnoredVideoId(video.videoId),
	)
	if (ignoredVideos.length) {
		console.log(
			`Ignore list: skipping ${ignoredVideos.length} videos from discovery/indexing.`,
		)
		videos = videos.filter((video) => !isIgnoredVideoId(video.videoId))
	}

	const ignoredManifestDocIds = Object.keys(manifest.docs).filter((docId) =>
		isDocIdIgnored({ docId, ignoreList }),
	)
	const needsIgnoreRemovals = ignoredManifestDocIds.length > 0
	if (needsIgnoreRemovals) {
		console.log(
			`Ignore list: ${ignoredManifestDocIds.length} docs currently in the manifest will be removed.`,
		)
	}

	const discoveredDocIds = new Set(
		videos.map((v) => getDocId('youtube', v.videoId)),
	)

	let videosToIndex = videos
	if (incremental && !reindex) {
		videosToIndex = videos.filter((video) => {
			const docId = getDocId('youtube', video.videoId)
			return !manifest.docs[docId] || explicitVideoIds.has(video.videoId)
		})
	}
	const alreadyIndexedCount = videos.length - videosToIndex.length
	console.log(
		`Indexing mode: ${incremental ? 'incremental' : 'full'}${reindex ? ' (reindex)' : ''}${prune ? ' (prune)' : ''}`,
	)
	console.log(
		`Videos already indexed (skipping): ${alreadyIndexedCount}; videos to index: ${videosToIndex.length}`,
	)

	if (videosToIndex.length === 0) {
		console.log('No new videos to index.')
		if (dryRun) {
			console.log('Dry run complete. Skipping Vectorize/R2 writes.')
			return
		}
		if (!prune && !needsIgnoreRemovals) return
		// If pruning, we still need to update Vectorize + manifest for removals.
		// (We still had to talk to YouTube to discover the current set.)
	}

	const transcriptCacheDir = getTranscriptCacheDir(cacheDirArg)
	if (useCache) {
		console.log(
			`Transcript cache: ${transcriptCacheDir}${refreshCache ? ' (refreshing)' : ''}`,
		)
	}

	// YouTube player responses (including captions) often require an STS
	// (signatureTimestamp) in playbackContext. We can fetch it from any watch page.
	let signatureTimestamp: number | null = null
	if (videosToIndex.length > 0) {
		try {
			const probeVideoId =
				videosToIndex[0]?.videoId ??
				videos[0]?.videoId ??
				playlistVideos[0]?.videoId
			if (probeVideoId) {
				signatureTimestamp = await fetchYouTubeSignatureTimestamp(probeVideoId)
			}
		} catch (error) {
			console.warn(
				'Failed to fetch YouTube signatureTimestamp (STS); transcripts may be unavailable.',
				error,
			)
		}
	}

	const transcriptConcurrency = Number(
		process.env.YOUTUBE_TRANSCRIPT_CONCURRENCY ?? '3',
	)
	const enriched = await mapWithConcurrency(
		videosToIndex,
		Number.isFinite(transcriptConcurrency) ? transcriptConcurrency : 3,
		async (video, index) => {
			const cacheKey = {
				cacheDir: transcriptCacheDir,
				videoId: video.videoId,
				includeAutoCaptions,
			}
			if (useCache && !refreshCache) {
				const cached = await readVideoEnrichedDataCache(cacheKey)
				if (cached) {
					console.log(`Cache hit (${video.videoId})`)
					return { video, details: cached }
				}
			}

			console.log(
				`${useCache && refreshCache ? 'Refreshing' : 'Fetching'} transcript/metadata ${index + 1}/${videosToIndex.length} (${video.videoId})`,
			)
			const details = await fetchVideoEnrichedData({
				config: browseConfig,
				videoId: video.videoId,
				includeAutoCaptions,
				signatureTimestamp,
			})
			if (useCache) {
				await writeVideoEnrichedDataCache({ ...cacheKey, data: details }).catch(
					(error) =>
						console.warn(`Failed to write cache (${video.videoId})`, error),
				)
			}
			return { video, details }
		},
	)

	const transcriptSourceCounts = enriched.reduce(
		(acc, item) => {
			acc[item.details.transcriptSource]++
			return acc
		},
		{ manual: 0, auto: 0, none: 0 } as Record<TranscriptSource, number>,
	)
	console.log('Transcript source summary:', transcriptSourceCounts)
	if (dryRun) {
		console.log('Dry run complete. Skipping Vectorize/R2 writes.')
		return
	}

	const { accountId, apiToken, vectorizeIndex, embeddingModel } =
		getCloudflareConfig()

	const idsToDelete: string[] = []
	const toUpsert: Array<{
		vectorId: string
		text: string
		metadata: Record<string, unknown>
	}> = []
	const nextDocs: Record<string, ManifestDoc> = {}

	// In non-prune mode we normally carry forward any existing manifest docs.
	// The ignore list is an explicit override: ensure ignored docs are removed
	// from the manifest and their vectors are deleted.
	if (!prune) {
		let ignoredFromManifest = 0
		for (const [docId, oldDoc] of Object.entries(manifest.docs)) {
			if (isDocIdIgnored({ docId, ignoreList })) {
				ignoredFromManifest++
				for (const chunk of oldDoc.chunks ?? []) {
					if (chunk?.id) idsToDelete.push(String(chunk.id))
				}
				continue
			}
			nextDocs[docId] = oldDoc
		}
		if (ignoredFromManifest) {
			console.log(
				`Ignore list: deleting ${ignoredFromManifest} existing manifest docs (non-prune mode).`,
			)
		}
	}
	if (prune) {
		// In prune mode we intentionally rebuild `nextDocs` from discovered videos.
		// (Ignored docs were filtered out of discovery above.)
	}

	for (const { video, details } of enriched) {
		const videoId = video.videoId
		const docId = getDocId('youtube', videoId)
		if (isDocIdIgnored({ docId, ignoreList })) continue
		const url = `/youtube?video=${encodeURIComponent(videoId)}`
		const title = details.title || video.title || `YouTube video ${videoId}`
		const isFromPlaylist = video.sources.includes('playlist')
		const description = normalizeText(
			details.description || video.description || '',
		)
		const transcript = details.transcript

		// Index "meta" (title/description) separately from time-aligned transcript chunks
		// so YouTube results can deep-link to the approximate match timestamp.
		const metaText = normalizeText(
			[
				`Title: ${title}`,
				`Type: youtube`,
				`URL: ${url}`,
				`Sources: ${video.sources.join(', ')}`,
				isFromPlaylist ? `Playlist ID: ${playlistId}` : '',
				isFromPlaylist ? `Playlist Title: ${playlistTitle}` : '',
				`Video ID: ${videoId}`,
				video.channelTitle || details.channelTitle
					? `Channel: ${video.channelTitle ?? details.channelTitle ?? ''}`
					: '',
				video.durationText ? `Duration: ${video.durationText}` : '',
				video.publishedText ? `Published: ${video.publishedText}` : '',
				`Transcript source: ${details.transcriptSource}`,
				'',
				description,
			].join('\n'),
		)
		const metaChunks = chunkText(metaText, {
			targetChars: 3500,
			overlapChars: 500,
			maxChunkChars: 5500,
		}).map((body): YoutubeChunkItem => ({ kind: 'meta', body }))

		const transcriptChunks: YoutubeChunkItem[] = details.transcriptEvents.length
			? chunkTranscriptEvents(details.transcriptEvents, {
					targetChars: 3500,
					maxChunkChars: 5500,
				}).map((c): YoutubeChunkItem => ({
					kind: 'transcript',
					body: c.body,
					startSeconds: Math.floor(c.startMs / 1000),
					endSeconds: Math.ceil(c.endMs / 1000),
				}))
			: transcript
				? chunkText(transcript, {
						targetChars: 3500,
						overlapChars: 500,
						maxChunkChars: 5500,
					}).map((body): YoutubeChunkItem => ({ kind: 'transcript', body }))
				: []

		const chunkItems = [...metaChunks, ...transcriptChunks]
		const chunkCount = chunkItems.length
		const oldChunksById = new Map(
			(manifest.docs[docId]?.chunks ?? []).map((chunk) => [chunk.id, chunk]),
		)
		const chunks: ManifestChunk[] = []

		for (let index = 0; index < chunkItems.length; index++) {
			const item = chunkItems[index]
			if (!item) continue
			const body = item.body
			const vectorId = `youtube:${videoId}:chunk:${index}`
			const hash = sha256(body)
			const snippet = makeSnippet(body)
			chunks.push({
				id: vectorId,
				hash,
				snippet,
				chunkIndex: index,
				chunkCount,
				kind: item.kind,
				startSeconds: item.kind === 'transcript' ? item.startSeconds : undefined,
				endSeconds: item.kind === 'transcript' ? item.endSeconds : undefined,
			})
			if (oldChunksById.get(vectorId)?.hash === hash) continue

			const startSeconds = item.kind === 'transcript' ? item.startSeconds : undefined
			const endSeconds = item.kind === 'transcript' ? item.endSeconds : undefined

			toUpsert.push({
				vectorId,
				text: body,
				metadata: {
					type: 'youtube',
					slug: videoId,
					videoId,
					playlistId,
					url,
					title,
					snippet,
					chunkIndex: index,
					chunkCount,
					chunkKind: item.kind,
					contentHash: hash,
					sourceUpdatedAt: details.publishedAt,
					transcriptSource: details.transcriptSource,
					...(typeof startSeconds === 'number' ? { startSeconds } : {}),
					...(typeof endSeconds === 'number' ? { endSeconds } : {}),
					sources: video.sources,
					imageUrl:
						video.thumbnailUrl ??
						`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
					imageAlt: title,
				},
			})
		}

		for (const oldChunk of oldChunksById.values()) {
			if (!chunks.find((chunk) => chunk.id === oldChunk.id)) {
				idsToDelete.push(oldChunk.id)
			}
		}

		nextDocs[docId] = {
			type: 'youtube',
			url,
			title,
			sourceUpdatedAt: details.publishedAt,
			transcriptSource: details.transcriptSource,
			chunks,
		}
	}

	// If pruning is enabled, carry over discovered-but-not-reindexed docs and
	// delete anything no longer discovered.
	if (prune) {
		for (const video of videos) {
			const docId = getDocId('youtube', video.videoId)
			if (nextDocs[docId]) continue
			const existing = manifest.docs[docId]
			if (existing) nextDocs[docId] = existing
		}

		for (const [docId, oldDoc] of Object.entries(manifest.docs)) {
			if (nextDocs[docId]) continue
			// Delete docs we did NOT discover this run (playlist/appearances).
			// Note: discovery is affected by --max-videos, which is why we refuse
			// pruning when --max-videos is set.
			if (discoveredDocIds.has(docId)) continue
			for (const chunk of oldDoc.chunks) idsToDelete.push(chunk.id)
		}
	}

	console.log(`Vectors to delete: ${idsToDelete.length}`)
	for (const idBatch of batch(idsToDelete, 500)) {
		if (!idBatch.length) continue
		console.log(`Deleting ${idBatch.length} vectors...`)
		await vectorizeDeleteByIds({
			accountId,
			apiToken,
			indexName: vectorizeIndex,
			ids: idBatch,
		})
	}

	console.log(`Vectors to upsert: ${toUpsert.length}`)
	const upsertVectors: Array<{
		id: string
		values: number[]
		metadata: Record<string, unknown>
	}> = []
	const embedBatches = batch(toUpsert, 50)
	for (let i = 0; i < embedBatches.length; i++) {
		const embedBatch = embedBatches[i]!
		console.log(
			`Embedding batch ${i + 1}/${embedBatches.length} (${embedBatch.length} items)`,
		)
		const vectors = await embedItemsSafely({
			accountId,
			apiToken,
			model: embeddingModel,
			items: embedBatch,
		})
		console.log(
			`Embedded batch ${i + 1}/${embedBatches.length} -> ${vectors.length} vectors`,
		)
		upsertVectors.push(...vectors)
	}

	const upsertBatches = batch(upsertVectors, 200)
	for (let i = 0; i < upsertBatches.length; i++) {
		const vectorBatch = upsertBatches[i]!
		if (!vectorBatch.length) continue
		console.log(
			`Upserting batch ${i + 1}/${upsertBatches.length} (${vectorBatch.length} vectors)`,
		)
		await vectorizeUpsert({
			accountId,
			apiToken,
			indexName: vectorizeIndex,
			vectors: vectorBatch,
		})
	}

	const nextManifest: Manifest = { version: 1, docs: nextDocs }
	await putJsonObject({
		bucket: r2Bucket,
		key: manifestKey,
		value: nextManifest,
	})
	console.log(`Updated manifest written to r2://${r2Bucket}/${manifestKey}`)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
