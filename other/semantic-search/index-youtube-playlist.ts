import fs from 'node:fs/promises'
import path from 'node:path'
import { chunkText, makeSnippet, normalizeText, sha256 } from './chunk-utils.ts'
import {
	getCloudflareConfig,
	getEmbeddings,
	vectorizeDeleteByIds,
	vectorizeUpsert,
} from './cloudflare.ts'
import { getJsonObject, putJsonObject } from './r2-manifest.ts'

type DocType = 'youtube'
type TranscriptSource = 'manual' | 'auto' | 'none'
type VideoSource = 'playlist' | 'appearances'

type ManifestChunk = {
	id: string
	hash: string
	snippet: string
	chunkIndex: number
	chunkCount: number
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
	transcriptSource: TranscriptSource
}

const DEFAULT_PLAYLIST_ID = 'PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf'

function parseArgs() {
	const args = process.argv.slice(2)
	const get = (name: string) => {
		const i = args.indexOf(name)
		return i >= 0 ? args[i + 1] : undefined
	}

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

function mergeVideos({
	playlistVideos,
	appearancesVideos,
	maxVideos,
}: {
	playlistVideos: PlaylistVideo[]
	appearancesVideos: PlaylistVideo[]
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
}: {
	config: YouTubeBrowseConfig
	videoId: string
}) {
	const url = `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(
		config.apiKey,
	)}`
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

	type Json3Event = { segs?: Array<{ utf8?: string }> }
	type Json3 = { events?: Json3Event[] }
	const json = await fetchJsonWithRetries<Json3>(transcriptUrl.toString(), {
		label,
		init: {
			headers: getYouTubeRequestHeaders(),
		},
	})
	const lines: string[] = []
	for (const event of json.events ?? []) {
		const line = (event.segs ?? [])
			.map((seg) => seg.utf8 ?? '')
			.join('')
			.replace(/\u200B/g, '')
			.trim()
		if (line) lines.push(line)
	}
	return normalizeText(lines.join('\n'))
}

async function fetchVideoEnrichedData({
	config,
	videoId,
	includeAutoCaptions,
}: {
	config: YouTubeBrowseConfig
	videoId: string
	includeAutoCaptions: boolean
}): Promise<VideoEnrichedData> {
	try {
		const player = await fetchYouTubePlayerJson({ config, videoId })
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
			if (playabilityCode === 'LOGIN_REQUIRED' && playabilityReason) {
				console.warn(
					`YouTube transcript unavailable for ${videoId}: ${playabilityReason}`,
				)
			}
			return {
				title,
				description,
				channelTitle,
				publishedAt,
				transcript: '',
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
			transcript,
			transcriptSource: transcript ? chosen.source : 'none',
		}
	} catch (error) {
		console.warn(`Failed to fetch transcript/metadata for ${videoId}`, error)
		return {
			title: undefined,
			description: '',
			transcript: '',
			transcriptSource: 'none',
		}
	}
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
	const videos = mergeVideos({ playlistVideos, appearancesVideos, maxVideos })
	const playlistSourceCount = videos.filter((video) =>
		video.sources.includes('playlist'),
	).length
	const appearancesSourceCount = videos.filter((video) =>
		video.sources.includes('appearances'),
	).length
	console.log(
		`Total unique videos to process: ${videos.length} (playlist: ${playlistSourceCount}, appearances: ${appearancesSourceCount})${maxVideos ? `, capped by --max-videos=${maxVideos}` : ''}`,
	)

	const transcriptConcurrency = Number(
		process.env.YOUTUBE_TRANSCRIPT_CONCURRENCY ?? '3',
	)
	const enriched = await mapWithConcurrency(
		videos,
		Number.isFinite(transcriptConcurrency) ? transcriptConcurrency : 3,
		async (video, index) => {
			console.log(
				`Fetching transcript/metadata ${index + 1}/${videos.length} (${video.videoId})`,
			)
			const details = await fetchVideoEnrichedData({
				config: browseConfig,
				videoId: video.videoId,
				includeAutoCaptions,
			})
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
	const r2Bucket = process.env.R2_BUCKET ?? 'kcd-semantic-search'

	const manifest = (await getJsonObject<Manifest>({
		bucket: r2Bucket,
		key: manifestKey,
	})) ?? {
		version: 1,
		docs: {},
	}

	const idsToDelete: string[] = []
	const toUpsert: Array<{
		vectorId: string
		text: string
		metadata: Record<string, unknown>
	}> = []
	const nextDocs: Record<string, ManifestDoc> = {}

	for (const { video, details } of enriched) {
		const videoId = video.videoId
		const docId = getDocId('youtube', videoId)
		const url = `/youtube?video=${encodeURIComponent(videoId)}`
		const title = details.title || video.title || `YouTube video ${videoId}`
		const isFromPlaylist = video.sources.includes('playlist')
		const description = normalizeText(
			details.description || video.description || '',
		)
		const transcript = details.transcript

		const text = normalizeText(
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
				'',
				transcript,
			].join('\n'),
		)

		const chunkBodies = chunkText(text, {
			targetChars: 3500,
			overlapChars: 500,
			maxChunkChars: 5500,
		})
		const chunkCount = chunkBodies.length
		const oldChunksById = new Map(
			(manifest.docs[docId]?.chunks ?? []).map((chunk) => [chunk.id, chunk]),
		)
		const chunks: ManifestChunk[] = []

		for (let index = 0; index < chunkBodies.length; index++) {
			const body = chunkBodies[index] ?? ''
			const vectorId = `youtube:${videoId}:chunk:${index}`
			const hash = sha256(body)
			const snippet = makeSnippet(body)
			chunks.push({
				id: vectorId,
				hash,
				snippet,
				chunkIndex: index,
				chunkCount,
			})
			if (oldChunksById.get(vectorId)?.hash === hash) continue

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
					contentHash: hash,
					sourceUpdatedAt: details.publishedAt,
					transcriptSource: details.transcriptSource,
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

	for (const [docId, oldDoc] of Object.entries(manifest.docs)) {
		if (nextDocs[docId]) continue
		for (const chunk of oldDoc.chunks) idsToDelete.push(chunk.id)
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
