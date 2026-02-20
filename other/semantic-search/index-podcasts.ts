import slugify from '@sindresorhus/slugify'
import { getEpisodePath as getCallKentEpisodePath } from '#app/utils/call-kent.ts'
import { getCWKEpisodePath } from '#app/utils/chats-with-kent.ts'
import { markdownToHtml, stripHtml } from '#app/utils/markdown.server.ts'
import {
	chunkText,
	makeSnippet,
	mapWithConcurrency,
	normalizeText,
	sha256,
} from './chunk-utils.ts'
import {
	getCloudflareConfig,
	getEmbeddings,
	vectorizeDeleteByIds,
	vectorizeUpsert,
} from './cloudflare.ts'
import { getJsonObject, putJsonObject } from './r2-manifest.ts'

type DocType = 'ck' | 'cwk'

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
	chunks: ManifestChunk[]
}

type Manifest = {
	version: 1
	docs: Record<string, ManifestDoc>
}

function parseArgs() {
	const args = process.argv.slice(2)
	const get = (name: string) => {
		const i = args.indexOf(name)
		return i >= 0 ? args[i + 1] : undefined
	}
	return {
		manifestKey: get('--manifest-key') ?? 'manifests/podcasts.json',
	}
}

function getRequiredEnv(name: string) {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

function batch<T>(items: T[], size: number) {
	const result: T[][] = []
	for (let i = 0; i < items.length; i += size) {
		result.push(items.slice(i, i + size))
	}
	return result
}

async function fetchJsonWithRetries<T>(
	url: string,
	{
		headers,
		maxRetries = 5,
		baseDelayMs = 750,
		label,
		on429,
	}: {
		headers?: Record<string, string>
		maxRetries?: number
		baseDelayMs?: number
		label?: string
		on429?: () => void
	} = {},
): Promise<{ ok: true; json: T } | { ok: false; status: number }> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const res = await fetch(url, { headers })
		if (res.status === 429) {
			on429?.()
			const retryAfter = Number(res.headers.get('Retry-After') ?? '0')
			const delayMs =
				(retryAfter > 0 ? retryAfter * 1000 : baseDelayMs) * (attempt + 1)
			console.warn(
				`${label ?? 'request'}: 429 (attempt ${attempt + 1}/${maxRetries + 1}), waiting ${Math.round(
					delayMs,
				)}ms`,
			)
			await new Promise((r) => setTimeout(r, delayMs))
			continue
		}
		if (!res.ok) {
			// Retry 5xx.
			if (res.status >= 500 && attempt < maxRetries) {
				const delayMs = baseDelayMs * (attempt + 1)
				console.warn(
					`${label ?? 'request'}: ${res.status} (attempt ${attempt + 1}/${
						maxRetries + 1
					}), waiting ${Math.round(delayMs)}ms`,
				)
				await new Promise((r) => setTimeout(r, delayMs))
				continue
			}
			return { ok: false, status: res.status }
		}
		const json = (await res.json()) as T
		return { ok: true, json }
	}
	return { ok: false, status: 429 }
}

function getDocId(type: DocType, key: string) {
	return `${type}:${key}`
}

function episodeKey({
	seasonNumber,
	episodeNumber,
}: {
	seasonNumber: number
	episodeNumber: number
}) {
	return `s${String(seasonNumber).padStart(2, '0')}e${String(episodeNumber).padStart(2, '0')}`
}

async function toPlainText(markdownOrHtml: string) {
	if (!markdownOrHtml) return ''
	const trimmed = markdownOrHtml.trim()
	const html = trimmed.startsWith('<') ? trimmed : await markdownToHtml(trimmed)
	return await stripHtml(html)
}

// --- Call Kent (Transistor) ---
type TransistorEpisodesJson = {
	data: Array<{
		attributes: {
			number?: number
			season?: number
			status?: string
			audio_processing?: boolean
			duration?: number
			title: string
			summary?: string
			description?: string
			keywords?: string[] | string
			updated_at?: string
			published_at?: string
			media_url?: string
		}
	}>
	meta?: { totalPages?: number }
}

async function fetchTransistorEpisodes() {
	const transistorApiSecret = getRequiredEnv('TRANSISTOR_API_SECRET')
	const perPage = 100
	const headers = { 'x-api-key': transistorApiSecret }

	const fetchPage = async (page: number) => {
		const url = new URL('/v1/episodes', 'https://api.transistor.fm')
		url.searchParams.set('pagination[per]', String(perPage))
		url.searchParams.set('pagination[page]', String(page))
		const res = await fetch(url.toString(), { headers })
		if (!res.ok)
			throw new Error(`Transistor error: ${res.status} ${res.statusText}`)
		return (await res.json()) as TransistorEpisodesJson
	}

	const first = await fetchPage(1)
	const totalPages = first.meta?.totalPages ?? 1
	const all = [...first.data]
	for (const page of Array.from(
		{ length: Math.max(0, totalPages - 1) },
		(_, i) => i + 2,
	)) {
		const p = await fetchPage(page)
		all.push(...p.data)
	}

	const episodes = []
	for (const e of all) {
		const a = e.attributes
		if (a.audio_processing) continue
		if (a.status !== 'published') continue
		if (!a.number || !a.season) continue
		if (!a.duration) continue
		let keywords: string[] = []
		if (Array.isArray(a.keywords)) {
			keywords = a.keywords.filter((k) => typeof k === 'string' && k.trim())
		} else if (typeof a.keywords === 'string') {
			keywords = a.keywords
				.split(',')
				.map((k) => k.trim())
				.filter(Boolean)
		}

		episodes.push({
			seasonNumber: a.season,
			episodeNumber: a.number,
			slug: a.title ? slugify(a.title) : undefined,
			title: a.title,
			summary: a.summary ?? '',
			descriptionHtml: a.description ?? '',
			keywords,
			updatedAt: a.updated_at,
		})
	}
	return episodes
}

// --- Chats with Kent (Simplecast) ---
type SimplecastTooManyRequests = { too_many_requests: true }
type SimplecastCollectionResponse<T> = { collection: T[] }
type SimplecastSeasonListItem = { href: string; number: number }
type SimplecastEpisodeListItem = {
	id: string
	status: string
	is_hidden: boolean
}
type SimplecastEpisode = {
	id: string
	is_published: boolean
	updated_at: string
	slug: string
	transcription?: string
	long_description?: string
	description?: string
	number: number
	duration: number
	title: string
	season: { number: number }
	keywords: { collection: Array<{ value: string }> }
}

function isTooManyRequests(json: unknown): json is SimplecastTooManyRequests {
	return Boolean(
		json &&
		typeof json === 'object' &&
		'too_many_requests' in json &&
		(json as any).too_many_requests,
	)
}

async function fetchSimplecastEpisodes() {
	const SIMPLECAST_KEY = getRequiredEnv('SIMPLECAST_KEY')
	const PODCAST_ID = getRequiredEnv('CHATS_WITH_KENT_PODCAST_ID')
	const headers = { authorization: `Bearer ${SIMPLECAST_KEY}` }
	let tooManyRequestsCount = 0

	const seasonsResult = await fetchJsonWithRetries<
		| SimplecastCollectionResponse<SimplecastSeasonListItem>
		| SimplecastTooManyRequests
	>(`https://api.simplecast.com/podcasts/${PODCAST_ID}/seasons`, {
		headers,
		label: 'simplecast seasons',
		on429: () => {
			tooManyRequestsCount++
		},
	})
	if (!seasonsResult.ok) {
		throw new Error(`Simplecast seasons error: ${seasonsResult.status}`)
	}
	const seasonsJson = seasonsResult.json
	if (isTooManyRequests(seasonsJson)) return []

	const seasonItems = seasonsJson.collection
	const episodes: SimplecastEpisode[] = []
	let episodeDetail429s = 0
	let episodeDetailsFailed = 0
	for (const season of seasonItems) {
		const seasonId = new URL(season.href).pathname.split('/').slice(-1)[0]
		if (!seasonId) continue
		const url = new URL(
			`https://api.simplecast.com/seasons/${seasonId}/episodes`,
		)
		url.searchParams.set('limit', '300')
		const seasonEpisodesResult = await fetchJsonWithRetries<
			| SimplecastCollectionResponse<SimplecastEpisodeListItem>
			| SimplecastTooManyRequests
		>(url.toString(), {
			headers,
			label: `simplecast season ${seasonId} episodes list`,
			on429: () => {
				tooManyRequestsCount++
			},
		})
		if (!seasonEpisodesResult.ok) {
			console.warn(
				`Simplecast episodes list error: ${seasonEpisodesResult.status}`,
			)
			continue
		}
		const seasonEpisodesJson = seasonEpisodesResult.json
		if (isTooManyRequests(seasonEpisodesJson)) continue

		const listItems = seasonEpisodesJson.collection.filter(
			(e) => e.status === 'published' && !e.is_hidden,
		)

		// Fetch episode details with limited concurrency to reduce 429s.
		const details = await mapWithConcurrency(listItems, 3, async (e) => {
			const result = await fetchJsonWithRetries<
				SimplecastEpisode | SimplecastTooManyRequests
			>(`https://api.simplecast.com/episodes/${e.id}`, {
				headers,
				label: `simplecast episode ${e.id}`,
				on429: () => {
					episodeDetail429s++
				},
			})
			if (!result.ok) {
				episodeDetailsFailed++
				console.warn(`Simplecast episode error: ${result.status}`)
				return null
			}
			const epJson = result.json
			if (isTooManyRequests(epJson)) return null
			if (!epJson.is_published) return null
			return epJson
		})

		episodes.push(...(details.filter(Boolean) as SimplecastEpisode[]))
	}

	if (tooManyRequestsCount || episodeDetail429s || episodeDetailsFailed) {
		console.log('Simplecast fetch summary', {
			tooManyRequestsCount,
			episodeDetail429s,
			episodeDetailsFailed,
		})
	}

	return episodes
}

async function main() {
	const { manifestKey } = parseArgs()
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

	const [ckEpisodes, cwkEpisodes] = await Promise.all([
		fetchTransistorEpisodes(),
		fetchSimplecastEpisodes(),
	])

	console.log(`Call Kent episodes: ${ckEpisodes.length}`)
	console.log(`Chats with Kent episodes: ${cwkEpisodes.length}`)

	// Build docs
	for (const e of ckEpisodes) {
		const key = episodeKey(e)
		const url = getCallKentEpisodePath({
			seasonNumber: e.seasonNumber,
			episodeNumber: e.episodeNumber,
			slug: e.slug,
		})
		const description = await toPlainText(e.descriptionHtml)
		const text = normalizeText(
			[
				`Title: ${e.title}`,
				`Type: ck`,
				`URL: ${url}`,
				`Season: ${e.seasonNumber}`,
				`Episode: ${e.episodeNumber}`,
				`Keywords: ${(e.keywords ?? []).join(', ')}`,
				'',
				e.summary ?? '',
				'',
				description,
			].join('\n'),
		)
		const title = e.title
		const chunkBodies = chunkText(text)
		const chunkCount = chunkBodies.length
		const docId = getDocId('ck', key)
		const oldChunksById = new Map(
			(manifest.docs[docId]?.chunks ?? []).map((c) => [c.id, c]),
		)

		const chunks: ManifestChunk[] = []
		for (let i = 0; i < chunkBodies.length; i++) {
			const body = chunkBodies[i] ?? ''
			const vectorId = `ck:${key}:chunk:${i}`
			const hash = sha256(body)
			const snippet = makeSnippet(body)
			chunks.push({ id: vectorId, hash, snippet, chunkIndex: i, chunkCount })
			if (oldChunksById.get(vectorId)?.hash === hash) continue
			toUpsert.push({
				vectorId,
				text: body,
				metadata: {
					type: 'ck',
					url,
					title,
					snippet,
					chunkIndex: i,
					chunkCount,
					contentHash: hash,
					sourceUpdatedAt: e.updatedAt,
				},
			})
		}
		for (const old of oldChunksById.values()) {
			if (!chunks.find((c) => c.id === old.id)) idsToDelete.push(old.id)
		}

		nextDocs[docId] = {
			type: 'ck',
			url,
			title,
			sourceUpdatedAt: e.updatedAt,
			chunks,
		}
	}

	for (const e of cwkEpisodes) {
		const seasonNumber = e.season.number
		const episodeNumber = e.number
		const key = episodeKey({ seasonNumber, episodeNumber })
		const url = getCWKEpisodePath({ seasonNumber, episodeNumber, slug: e.slug })
		const transcript = await toPlainText(e.transcription ?? '')
		const summary = await toPlainText(e.long_description ?? '')
		const description = await toPlainText(e.description ?? '')
		const keywords = e.keywords?.collection?.map((k) => k.value) ?? []

		const text = normalizeText(
			[
				`Title: ${e.title}`,
				`Type: cwk`,
				`URL: ${url}`,
				`Season: ${seasonNumber}`,
				`Episode: ${episodeNumber}`,
				`Keywords: ${keywords.join(', ')}`,
				'',
				description,
				'',
				summary,
				'',
				transcript,
			].join('\n'),
		)

		const title = e.title
		const chunkBodies = chunkText(text)
		const chunkCount = chunkBodies.length
		const docId = getDocId('cwk', key)
		const oldChunksById = new Map(
			(manifest.docs[docId]?.chunks ?? []).map((c) => [c.id, c]),
		)

		const chunks: ManifestChunk[] = []
		for (let i = 0; i < chunkBodies.length; i++) {
			const body = chunkBodies[i] ?? ''
			const vectorId = `cwk:${key}:chunk:${i}`
			const hash = sha256(body)
			const snippet = makeSnippet(body)
			chunks.push({ id: vectorId, hash, snippet, chunkIndex: i, chunkCount })
			if (oldChunksById.get(vectorId)?.hash === hash) continue
			toUpsert.push({
				vectorId,
				text: body,
				metadata: {
					type: 'cwk',
					url,
					title,
					snippet,
					chunkIndex: i,
					chunkCount,
					contentHash: hash,
					sourceUpdatedAt: e.updated_at,
				},
			})
		}
		for (const old of oldChunksById.values()) {
			if (!chunks.find((c) => c.id === old.id)) idsToDelete.push(old.id)
		}

		nextDocs[docId] = {
			type: 'cwk',
			url,
			title,
			sourceUpdatedAt: e.updated_at,
			chunks,
		}
	}

	// Vectors that exist in manifest but not in nextDocs are removed content.
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

	async function embedItemsSafely(
		items: typeof toUpsert,
	): Promise<
		Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>
	> {
		try {
			const embeddings = await getEmbeddings({
				accountId,
				apiToken,
				model: embeddingModel,
				texts: items.map((b) => b.text),
			})
			return items.map((item, i) => ({
				id: item.vectorId,
				values: embeddings[i]!,
				metadata: item.metadata,
			}))
		} catch (e) {
			if (items.length <= 1) {
				const item = items[0]
				console.error('Skipping vector due to embedding failure', {
					vectorId: item?.vectorId,
					textLength: item?.text?.length,
				})
				console.error(e)
				return []
			}
			const mid = Math.ceil(items.length / 2)
			const left = await embedItemsSafely(items.slice(0, mid))
			const right = await embedItemsSafely(items.slice(mid))
			return [...left, ...right]
		}
	}

	const embedBatches = batch(toUpsert, 50)
	for (let i = 0; i < embedBatches.length; i++) {
		const embedBatch = embedBatches[i]!
		console.log(
			`Embedding batch ${i + 1}/${embedBatches.length} (${embedBatch.length} items)`,
		)
		const vectors = await embedItemsSafely(embedBatch)
		console.log(
			`Embedded batch ${i + 1}/${embedBatches.length} -> ${vectors.length} vectors`,
		)
		upsertVectors.push(...vectors)
	}

	const upsertBatches = batch(upsertVectors, 200)
	for (let i = 0; i < upsertBatches.length; i++) {
		const vecBatch = upsertBatches[i]!
		if (!vecBatch.length) continue
		console.log(
			`Upserting batch ${i + 1}/${upsertBatches.length} (${vecBatch.length} vectors)`,
		)
		await vectorizeUpsert({
			accountId,
			apiToken,
			indexName: vectorizeIndex,
			vectors: vecBatch,
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

main().catch((e) => {
	console.error(e)
	process.exitCode = 1
})
