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
}

type VideoEnrichedData = {
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
		language: get('--language') ?? 'en',
		includeAutoCaptions: parseBoolean(get('--include-auto-captions'), true),
	}
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
	if (typeof value !== 'string') return defaultValue
	const normalized = value.trim().toLowerCase()
	if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
	if (['0', 'false', 'no', 'off'].includes(normalized)) return false
	return defaultValue
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
			headers: {
				'Content-Type': 'application/json',
			},
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
}: {
	playlistId: string
	maxVideos?: number
}) {
	const config = await getYouTubeBrowseConfig(playlistId)
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

function extractJsonObjectAfterMarker({
	source,
	marker,
}: {
	source: string
	marker: string
}) {
	const markerIndex = source.indexOf(marker)
	if (markerIndex < 0) return null
	const start = source.indexOf('{', markerIndex + marker.length)
	if (start < 0) return null
	let depth = 0
	let inString = false
	let quoteChar = ''
	let escaped = false
	for (let i = start; i < source.length; i++) {
		const char = source[i] ?? ''
		if (inString) {
			if (escaped) {
				escaped = false
				continue
			}
			if (char === '\\') {
				escaped = true
				continue
			}
			if (char === quoteChar) {
				inString = false
				quoteChar = ''
			}
			continue
		}
		if (char === '"' || char === "'") {
			inString = true
			quoteChar = char
			continue
		}
		if (char === '{') {
			depth++
			continue
		}
		if (char === '}') {
			depth--
			if (depth === 0) {
				return source.slice(start, i + 1)
			}
		}
	}
	return null
}

async function getWatchPlayerResponse(videoId: string) {
	const watchUrl = new URL('https://www.youtube.com/watch')
	watchUrl.searchParams.set('v', videoId)
	watchUrl.searchParams.set('hl', 'en')
	watchUrl.searchParams.set('bpctr', '9999999999')
	watchUrl.searchParams.set('has_verified', '1')

	const html = await fetchTextWithRetries(watchUrl.toString(), {
		label: `youtube watch ${videoId}`,
	})
	const raw =
		extractJsonObjectAfterMarker({
			source: html,
			marker: 'var ytInitialPlayerResponse = ',
		}) ??
		extractJsonObjectAfterMarker({
			source: html,
			marker: 'ytInitialPlayerResponse = ',
		})

	if (!raw)
		throw new Error(`Could not locate ytInitialPlayerResponse for ${videoId}`)
	return JSON.parse(raw) as Record<string, unknown>
}

type CaptionTrack = {
	baseUrl: string
	languageCode?: string
	kind?: string
}

function pickCaptionTrack({
	tracks,
	language,
	includeAutoCaptions,
}: {
	tracks: CaptionTrack[]
	language: string
	includeAutoCaptions: boolean
}): { track: CaptionTrack; source: Exclude<TranscriptSource, 'none'> } | null {
	const normalizedLanguage = language.toLowerCase()
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
	videoId,
	language,
	includeAutoCaptions,
}: {
	videoId: string
	language: string
	includeAutoCaptions: boolean
}): Promise<VideoEnrichedData> {
	try {
		const player = await getWatchPlayerResponse(videoId)
		const videoDetails = asRecord(player.videoDetails)
		const microformat = asRecord(
			asRecord(player.microformat)?.playerMicroformatRenderer,
		)

		const description = asString(videoDetails?.shortDescription) ?? ''
		const channelTitle = asString(videoDetails?.author)
		const publishedAt =
			asString(microformat?.publishDate) ?? asString(microformat?.uploadDate)

		const tracklist = asRecord(
			asRecord(asRecord(player.captions)?.playerCaptionsTracklistRenderer),
		)
		const tracks = asArray(tracklist?.captionTracks)
			.map((track) => {
				const record = asRecord(track)
				const baseUrl = asString(record?.baseUrl)
				if (!baseUrl) return null
				return {
					baseUrl,
					languageCode: asString(record?.languageCode),
					kind: asString(record?.kind),
				} satisfies CaptionTrack
			})
			.filter((track): track is CaptionTrack => Boolean(track))

		const chosen = pickCaptionTrack({
			tracks,
			language,
			includeAutoCaptions,
		})
		if (!chosen) {
			return {
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
			description,
			channelTitle,
			publishedAt,
			transcript,
			transcriptSource: transcript ? chosen.source : 'none',
		}
	} catch (error) {
		console.warn(`Failed to fetch transcript/metadata for ${videoId}`, error)
		return {
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
		language,
		includeAutoCaptions,
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
	const { accountId, apiToken, vectorizeIndex, embeddingModel } =
		getCloudflareConfig()
	const r2Bucket = process.env.R2_BUCKET ?? 'kcd-semantic-search'

	console.log(`Loading playlist ${playlistId}...`)
	const { playlistTitle, videos } = await fetchPlaylistVideos({
		playlistId,
		maxVideos,
	})
	console.log(
		`Playlist "${playlistTitle}" videos discovered: ${videos.length}${maxVideos ? ` (limited by --max-videos=${maxVideos})` : ''}`,
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
				videoId: video.videoId,
				language,
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
		const title = video.title
		const description = normalizeText(
			details.description || video.description || '',
		)
		const transcript = details.transcript

		const text = normalizeText(
			[
				`Title: ${title}`,
				`Type: youtube`,
				`URL: ${url}`,
				`Playlist ID: ${playlistId}`,
				`Playlist Title: ${playlistTitle}`,
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
