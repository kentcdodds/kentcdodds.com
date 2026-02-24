import { createHash } from 'node:crypto'
import { promises as fs, type Dirent } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import slugify from '@sindresorhus/slugify'
import { matchSorter } from 'match-sorter'
import {
	http,
	HttpResponse,
	passthrough,
	type DefaultBodyType,
	type DefaultRequestMultipartBody,
	type HttpHandler,
} from 'msw'
import { mockTransistorEpisodes } from './transistor.ts'
import { requiredHeader } from './utils.ts'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

function getBearerToken(request: Request) {
	const raw = request.headers.get('authorization') ?? ''
	const match = /^\s*bearer\s+(?<token>.+?)\s*$/iu.exec(raw)
	const token = match?.groups?.token?.trim()
	return token || null
}

function shouldMockCloudflare(request: Request) {
	// Align with other mocks: only intercept when the token explicitly opts in.
	// This makes it possible to run with `MOCKS=true` while still using real CF
	// credentials by setting a non-MOCK token.
	const token = getBearerToken(request)
	return Boolean(token && token.startsWith('MOCK'))
}

// Keep vectors small to avoid wasting CPU/memory in local mocks.
const DEFAULT_EMBEDDING_DIMS = 12

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const contentRoot = path.join(repoRoot, 'content')

type SearchDoc = {
	id: string
	type: string
	title: string
	url: string
	snippet: string
	content: string
}

type CloudflareApiEnvelope<T> = {
	success: boolean
	errors: Array<{ code: number; message: string }>
	messages: Array<{ code: number; message: string }>
	result: T
}

type VectorizeStoredVector = {
	id: string
	values: number[]
	metadata: Record<string, unknown>
	namespace: string
}

type VectorizeIndexStore = Map<string, Map<string, VectorizeStoredVector>>

// Keyed by `${accountId}:${indexName}`.
const vectorizeIndexes = new Map<string, VectorizeIndexStore>()
const seededIndexPromises = new Map<string, Promise<void>>()

const embeddingVectorToText = new Map<
	string,
	{ text: string; timestamp: number }
>()

let searchCorpusPromise: Promise<SearchDoc[]> | null = null
const docEmbeddingCache = new Map<string, number[]>()

// Call this in tests (beforeEach) to avoid cross-test pollution.
export function resetCloudflareMockState() {
	vectorizeIndexes.clear()
	seededIndexPromises.clear()
	embeddingVectorToText.clear()
}

function jsonOk<T>(result: T, init?: { status?: number }) {
	const body: CloudflareApiEnvelope<T> = {
		success: true,
		errors: [],
		messages: [],
		result,
	}
	return HttpResponse.json(body, { status: init?.status ?? 200 })
}

function jsonError(
	status: number,
	message: string,
	code = 10000, // generic
) {
	const body: CloudflareApiEnvelope<null> = {
		success: false,
		errors: [{ code, message }],
		messages: [],
		result: null,
	}
	return HttpResponse.json(body, { status })
}

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n))
}

function makePcm16SineWaveWav({
	durationSeconds,
	frequencyHz,
	sampleRate = 8000,
	amplitude = 0.25,
}: {
	durationSeconds: number
	frequencyHz: number
	sampleRate?: number
	amplitude?: number
}) {
	const safeDuration = clamp(durationSeconds, 0.25, 30)
	const numSamples = Math.floor(safeDuration * sampleRate)
	const dataSize = numSamples * 2 // 16-bit mono
	const buffer = Buffer.alloc(44 + dataSize)

	// RIFF header
	buffer.write('RIFF', 0, 'ascii')
	buffer.writeUInt32LE(36 + dataSize, 4) // file size - 8
	buffer.write('WAVE', 8, 'ascii')

	// fmt chunk
	buffer.write('fmt ', 12, 'ascii')
	buffer.writeUInt32LE(16, 16) // PCM
	buffer.writeUInt16LE(1, 20) // audio format (PCM)
	buffer.writeUInt16LE(1, 22) // channels
	buffer.writeUInt32LE(sampleRate, 24)
	buffer.writeUInt32LE(sampleRate * 2, 28) // byte rate
	buffer.writeUInt16LE(2, 32) // block align
	buffer.writeUInt16LE(16, 34) // bits per sample

	// data chunk
	buffer.write('data', 36, 'ascii')
	buffer.writeUInt32LE(dataSize, 40)

	const twoPiF = 2 * Math.PI * frequencyHz
	const scale = Math.max(0, Math.min(1, amplitude)) * 32767
	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate
		const sample = Math.round(Math.sin(twoPiF * t) * scale)
		buffer.writeInt16LE(sample, 44 + i * 2)
	}

	return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

function frequencyFromSpeakerAndText(speaker: string, text: string) {
	const hash = createHash('sha256')
		.update(`${speaker}:${text.slice(0, 64)}`, 'utf8')
		.digest()
	const byte = hash[0] ?? 0
	// 220Hz..880Hz
	return 220 + Math.round((byte / 255) * 660)
}

function dot(a: number[], b: number[]) {
	const len = Math.min(a.length, b.length)
	let sum = 0
	for (let i = 0; i < len; i++) sum += a[i]! * b[i]!
	return sum
}

function norm(a: number[]) {
	let sum = 0
	for (const v of a) sum += v * v
	return Math.sqrt(sum)
}

function cosineSimilarity(a: number[], b: number[]) {
	const na = norm(a)
	const nb = norm(b)
	if (!na || !nb) return 0
	return dot(a, b) / (na * nb)
}

function scoreFromSimilarity(sim: number) {
	// Cosine sim is [-1, 1]; CF Vectorize "score" is typically [0, 1].
	return clamp((sim + 1) / 2, 0, 1)
}

function hashToUnitFloats(hash: Buffer, dims: number) {
	// Map bytes to [-1, 1].
	const out: number[] = []
	for (let i = 0; i < dims; i++) {
		const byte = hash[i % hash.length]!
		out.push((byte / 255) * 2 - 1)
	}
	return out
}

function textToEmbedding(text: string, dims = DEFAULT_EMBEDDING_DIMS) {
	const hash = createHash('sha256').update(text, 'utf8').digest()
	return hashToUnitFloats(hash, dims)
}

function vectorKey(vector: number[]) {
	// Keep this stable across JSON round-trips.
	return vector.map((n) => Number(n).toFixed(6)).join(',')
}

function rememberEmbedding(vector: number[], text: string) {
	const key = vectorKey(vector)
	embeddingVectorToText.set(key, { text, timestamp: Date.now() })

	// Best-effort pruning to prevent unbounded growth.
	const maxEntries = 200
	if (embeddingVectorToText.size <= maxEntries) return
	const entries = Array.from(embeddingVectorToText.entries()).sort(
		(a, b) => a[1].timestamp - b[1].timestamp,
	)
	for (const [oldKey] of entries.slice(
		0,
		embeddingVectorToText.size - maxEntries,
	)) {
		embeddingVectorToText.delete(oldKey)
	}
}

function getRememberedEmbeddingText(vector: number[]) {
	const key = vectorKey(vector)
	const entry = embeddingVectorToText.get(key)
	if (!entry) return null
	// Drop entries older than 10 minutes.
	if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
		embeddingVectorToText.delete(key)
		return null
	}
	return entry.text
}

function getIndexKey(accountId: string, indexName: string) {
	return `${accountId}:${indexName}`
}

function getOrCreateIndexStore(
	accountId: string,
	indexName: string,
): VectorizeIndexStore {
	const key = getIndexKey(accountId, indexName)
	let store = vectorizeIndexes.get(key)
	if (!store) {
		store = new Map()
		vectorizeIndexes.set(key, store)
	}
	return store
}

function allVectors(store: VectorizeIndexStore, namespace?: string) {
	if (typeof namespace === 'string') {
		const ns = store.get(namespace)
		return ns ? Array.from(ns.values()) : []
	}
	return Array.from(store.values()).flatMap((ns) => Array.from(ns.values()))
}

function stripSurroundingQuotes(value: string) {
	const trimmed = value.trim()
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1)
	}
	return trimmed
}

function parseSimpleFrontmatter(source: string) {
	const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
	if (!match)
		return {
			body: source,
			title: null as string | null,
			description: null as string | null,
		}

	const yaml = match[1] ?? ''
	let title: string | null = null
	let description: string | null = null
	for (const line of yaml.split('\n')) {
		const trimmed = line.trim()
		if (trimmed.startsWith('title:') && title === null) {
			title = stripSurroundingQuotes(trimmed.replace(/^title:\s*/i, ''))
		}
		if (trimmed.startsWith('description:') && description === null) {
			description = stripSurroundingQuotes(
				trimmed.replace(/^description:\s*/i, ''),
			)
		}
	}

	const body = source.slice(match[0].length)
	return { body, title, description }
}

function mdxToPlainText(source: string) {
	let text = source
	// Remove code blocks
	text = text.replace(/```[\s\S]*?```/g, ' ')
	// Remove MDX/HTML tags
	text = text.replace(/<[^>]+>/g, ' ')
	// Images: ![alt](url) -> alt
	text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
	// Links: [label](url) -> label
	text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
	// Headings/bullets/emphasis/backticks
	text = text.replace(/[#>*_`]/g, ' ')
	// Collapse whitespace
	text = text.replace(/\s+/g, ' ').trim()
	return text
}

async function listFilesRecursively({
	dir,
	extensions,
	maxFiles,
	maxDepth,
}: {
	dir: string
	extensions: string[]
	maxFiles: number
	maxDepth: number
}) {
	const results: string[] = []
	const walk = async (current: string, depth: number) => {
		if (results.length >= maxFiles) return
		if (depth > maxDepth) return
		let entries: Dirent[] = []
		try {
			entries = await fs.readdir(current, { withFileTypes: true })
		} catch {
			return
		}
		entries.sort((a, b) => a.name.localeCompare(b.name))
		for (const entry of entries) {
			if (results.length >= maxFiles) return
			if (entry.name.startsWith('.')) continue
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				await walk(full, depth + 1)
			} else if (entry.isFile()) {
				if (extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
					results.push(full)
				}
			}
		}
	}
	await walk(dir, 0)
	return results
}

function getStaticDocs(): SearchDoc[] {
	return [
		{
			id: '/search',
			title: 'Search',
			type: 'page',
			url: '/search',
			snippet:
				'Semantic search across posts, pages, podcasts, talks, and more.',
			content:
				'Search the site for posts, pages, podcasts, talks, resume, credits, and more.',
		},
		{
			id: '/contact',
			title: 'Contact',
			type: 'page',
			url: '/contact',
			snippet: 'Get in touch.',
			content: 'Contact Kent C. Dodds.',
		},
		{
			id: '/calls',
			title: 'Call Kent Podcast',
			type: 'podcast',
			url: '/calls',
			snippet:
				'Short, practical audio answers about React and software engineering.',
			content: 'Call Kent Podcast episodes.',
		},
	]
}

function getPodcastDocs(): SearchDoc[] {
	return mockTransistorEpisodes.map((episode) => {
		const a = episode.attributes
		const seasonNumber = typeof a.season === 'number' ? a.season : 1
		const episodeNumber = typeof a.number === 'number' ? a.number : 0
		const title =
			typeof a.title === 'string' && a.title ? a.title : 'Podcast episode'
		const slug = slugify(title)
		const url = [
			'/calls',
			seasonNumber.toString().padStart(2, '0'),
			episodeNumber.toString().padStart(2, '0'),
			slug || undefined,
		]
			.filter(Boolean)
			.join('/')

		const snippet =
			typeof a.summary === 'string' && a.summary
				? a.summary
				: typeof a.description === 'string'
					? a.description.slice(0, 200)
					: 'Podcast episode'

		const content =
			typeof a.description === 'string' && a.description
				? a.description
				: snippet

		return {
			id: url,
			type: 'podcast',
			title,
			url,
			snippet,
			content,
		}
	})
}

async function docsFromContentDir({
	dir,
	type,
	urlPrefix,
	maxFiles,
}: {
	dir: string
	type: string
	urlPrefix: string
	maxFiles: number
}): Promise<SearchDoc[]> {
	const extensions = ['.mdx', '.md']
	const files = await listFilesRecursively({
		dir,
		extensions,
		maxFiles,
		maxDepth: 4,
	})

	const docs: SearchDoc[] = []
	for (const filePath of files) {
		let raw = ''
		try {
			raw = await fs.readFile(filePath, 'utf8')
		} catch {
			continue
		}

		const relative = path.relative(dir, filePath).replace(/\\/g, '/')
		const slug = relative.replace(/\.(mdx|md)$/i, '')

		const { body, title, description } = parseSimpleFrontmatter(raw)
		const contentText = mdxToPlainText(body).slice(0, 20_000)

		const url =
			urlPrefix === '/'
				? slug === 'index'
					? '/'
					: `/${slug}`
				: slug === 'index'
					? urlPrefix
					: `${urlPrefix}/${slug}`

		const finalTitle = title ?? slug.split('/').pop() ?? url
		const snippet = (description ?? contentText).slice(0, 240)

		docs.push({
			id: url,
			type,
			title: finalTitle,
			url,
			snippet,
			content: contentText,
		})
	}

	return docs
}

async function getLocalContentDocs(): Promise<SearchDoc[]> {
	const docs: SearchDoc[] = []
	docs.push(
		...(await docsFromContentDir({
			dir: path.join(contentRoot, 'pages'),
			type: 'page',
			urlPrefix: '/',
			maxFiles: 200,
		})),
	)
	docs.push(
		...(await docsFromContentDir({
			dir: path.join(contentRoot, 'blog'),
			type: 'blog',
			urlPrefix: '/blog',
			maxFiles: 200,
		})),
	)
	return docs
}

async function buildSearchCorpus(): Promise<SearchDoc[]> {
	const docs: SearchDoc[] = [...getStaticDocs()]

	try {
		if (
			await fs
				.stat(contentRoot)
				.then((s) => s.isDirectory())
				.catch(() => false)
		) {
			docs.push(...(await getLocalContentDocs()))
		}
	} catch {
		// ignore missing content in unusual environments
	}

	try {
		docs.push(...getPodcastDocs())
	} catch {
		// ignore podcast docs if transistor mock data is unavailable
	}

	const seen = new Set<string>()
	return docs.filter((d) => {
		if (!d.id) return false
		if (seen.has(d.id)) return false
		seen.add(d.id)
		return true
	})
}

async function getSearchCorpus(): Promise<SearchDoc[]> {
	if (!searchCorpusPromise) {
		searchCorpusPromise = buildSearchCorpus()
	}
	try {
		return await searchCorpusPromise
	} catch {
		// If building the corpus ever fails, don't permanently cache the rejection.
		searchCorpusPromise = null
		const docs: SearchDoc[] = [...getStaticDocs()]
		try {
			docs.push(...getPodcastDocs())
		} catch {
			// ignore
		}
		return docs
	}
}

async function ensureSeededIndex(accountId: string, indexName: string) {
	const key = getIndexKey(accountId, indexName)
	const existing = seededIndexPromises.get(key)
	if (existing) return existing

	const seedPromise = (async () => {
		const store = getOrCreateIndexStore(accountId, indexName)
		const namespace = 'default'
		let nsStore = store.get(namespace)
		if (!nsStore) {
			nsStore = new Map<string, VectorizeStoredVector>()
			store.set(namespace, nsStore)
		}

		const docs = await getSearchCorpus()
		for (const doc of docs) {
			if (nsStore.has(doc.id)) continue
			let values = docEmbeddingCache.get(doc.id)
			if (!values) {
				values = textToEmbedding(`${doc.title}\n${doc.snippet}\n${doc.content}`)
				docEmbeddingCache.set(doc.id, values)
			}
			nsStore.set(doc.id, {
				id: doc.id,
				values,
				metadata: {
					type: doc.type,
					title: doc.title,
					url: doc.url,
					snippet: doc.snippet,
				},
				namespace,
			})
		}
	})().catch((e) => {
		seededIndexPromises.delete(key)
		throw e
	})

	seededIndexPromises.set(key, seedPromise)
	return seedPromise
}

async function parseVectorizeNdjsonVectors(request: Request) {
	const contentType = request.headers.get('content-type') ?? ''
	const lower = contentType.toLowerCase()

	// Support a simplified body for ad-hoc scripts/tests.
	if (lower.includes('application/x-ndjson')) {
		const ndjson = await request.text()
		return parseNdjsonVectorsText(ndjson)
	}

	if (!lower.includes('multipart/form-data')) {
		return {
			ok: false as const,
			error: 'Expected multipart/form-data (or application/x-ndjson) request.',
		}
	}

	const boundaryMatch =
		/\bboundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType) ?? null
	const boundaryRaw = boundaryMatch?.[1] ?? boundaryMatch?.[2] ?? ''
	const boundary = boundaryRaw.trim() || null
	if (!boundary) {
		return { ok: false as const, error: 'Missing multipart boundary.' }
	}

	const bodyBuf = Buffer.from(await request.arrayBuffer())
	const bodyText = bodyBuf.toString('utf8')
	const boundaryDelim = `--${boundary}`

	// Extremely small multipart parser: we only care about one field `vectors`
	// containing an NDJSON "file" (text).
	const parts = bodyText.split(boundaryDelim)
	let vectorsNdjson: string | null = null
	for (const part of parts) {
		if (!part.includes('name="vectors"')) continue
		const sepIdx = part.indexOf('\r\n\r\n')
		if (sepIdx === -1) continue
		let content = part.slice(sepIdx + 4)
		// Remove the trailing CRLF that precedes the next boundary.
		if (content.endsWith('\r\n')) content = content.slice(0, -2)
		vectorsNdjson = content
		break
	}

	if (!vectorsNdjson) {
		return { ok: false as const, error: 'Missing "vectors" multipart field.' }
	}

	return parseNdjsonVectorsText(vectorsNdjson)
}

function parseNdjsonVectorsText(ndjson: string) {
	const vectors: VectorizeStoredVector[] = []
	const lines = ndjson.split('\n').filter(Boolean)
	for (const line of lines) {
		let parsed: any
		try {
			parsed = JSON.parse(line)
		} catch (e) {
			return {
				ok: false as const,
				error: `Invalid NDJSON line: ${String(e)}`,
			}
		}

		const id = typeof parsed?.id === 'string' ? parsed.id : null
		const values = Array.isArray(parsed?.values)
			? (parsed.values as unknown[]).filter(
					(v): v is number => typeof v === 'number',
				)
			: null
		if (!id || !values || values.length === 0) {
			return {
				ok: false as const,
				error: 'Each vector must include { id: string, values: number[] }.',
			}
		}

		const namespace =
			typeof parsed?.namespace === 'string' && parsed.namespace
				? parsed.namespace
				: 'default'
		const metadata =
			parsed?.metadata && typeof parsed.metadata === 'object'
				? (parsed.metadata as Record<string, unknown>)
				: {}

		vectors.push({ id, values, namespace, metadata })
	}

	return { ok: true as const, vectors }
}

function modelFromWorkersAiGatewayPathname(pathname: string) {
	const marker = '/workers-ai/'
	const idx = pathname.indexOf(marker)
	if (idx === -1) return null
	const raw = pathname.slice(idx + marker.length)
	if (!raw) return null
	// `raw` may include slashes (e.g. @cf/google/embeddinggemma-300m) or be a
	// single encoded segment.
	return decodeURIComponent(raw)
}

type VectorizeHandlerArgs = {
	request: Request
	params: { accountId: string; indexName: string } & Record<string, string>
}

const handleVectorizeQuery = async ({
	request,
	params,
}: VectorizeHandlerArgs) => {
	requiredHeader(request.headers, 'authorization')
	const accountId = String(params.accountId)
	const indexName = String(params.indexName)

	let body: any
	try {
		body = await request.json()
	} catch {
		return jsonError(400, 'Invalid JSON body for Vectorize query.', 10002)
	}

	const vector = Array.isArray(body?.vector)
		? (body.vector as unknown[]).filter(
				(v): v is number => typeof v === 'number',
			)
		: null
	const topK = Number.isFinite(body?.topK) ? Number(body.topK) : 10
	const namespace =
		typeof body?.namespace === 'string' ? body.namespace : undefined

	if (!vector || vector.length === 0) {
		return jsonError(
			400,
			'Mock Vectorize expected JSON body { vector: number[], topK?: number }.',
			10003,
		)
	}

	await ensureSeededIndex(accountId, indexName)
	const store = getOrCreateIndexStore(accountId, indexName)

	const queryText = getRememberedEmbeddingText(vector)
	if (queryText) {
		const storedVectors = allVectors(store, namespace)
		const storedDocs: SearchDoc[] = storedVectors.map((v) => {
			const md = (v.metadata ?? {}) as Record<string, unknown>
			const title = typeof md.title === 'string' ? md.title : v.id
			const url = typeof md.url === 'string' ? md.url : v.id
			const snippet = typeof md.snippet === 'string' ? md.snippet : ''
			const type = typeof md.type === 'string' ? md.type : 'vector'
			return {
				id: v.id,
				type,
				title,
				url,
				snippet,
				content: `${title} ${snippet}`.trim(),
			}
		})

		let searchableDocs: SearchDoc[] = []
		if (namespace && namespace !== 'default') {
			searchableDocs = storedDocs
		} else {
			const corpus = await getSearchCorpus()
			const corpusIds = new Set(corpus.map((d) => d.id))
			const extras = storedDocs.filter((d) => !corpusIds.has(d.id))
			searchableDocs = [...corpus, ...extras]
		}

		const ranked = matchSorter(searchableDocs, queryText, {
			keys: ['title', 'snippet', 'content'],
		})
		if (ranked.length) {
			const limited = ranked.slice(0, clamp(Math.trunc(topK), 1, 100))
			const matches = limited.map((d, i) => ({
				id: d.id,
				score: clamp(0.99 - i * 0.02, 0, 1),
				metadata: {
					type: d.type,
					title: d.title,
					url: d.url,
					snippet: d.snippet,
				},
			}))
			return jsonOk({ count: matches.length, matches })
		}
	}

	const candidates = allVectors(store, namespace)

	const matches = candidates
		.map((v) => ({
			id: v.id,
			score: scoreFromSimilarity(cosineSimilarity(vector, v.values)),
			metadata: v.metadata,
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, clamp(Math.trunc(topK), 1, 100))

	return jsonOk({
		count: matches.length,
		matches,
	})
}

const makeVectorizeWriteHandler =
	(operation: 'insert' | 'upsert') =>
	async ({ request, params }: VectorizeHandlerArgs) => {
		requiredHeader(request.headers, 'authorization')
		const accountId = String(params.accountId)
		const indexName = String(params.indexName)
		const parsed = await parseVectorizeNdjsonVectors(request)
		if (!parsed.ok) return jsonError(400, parsed.error, 10005)

		const store = getOrCreateIndexStore(accountId, indexName)
		let updated = 0
		for (const v of parsed.vectors) {
			let ns = store.get(v.namespace)
			if (!ns) {
				ns = new Map()
				store.set(v.namespace, ns)
			}

			if (operation === 'insert' && ns.has(v.id)) {
				// Real Vectorize insert semantics should not overwrite existing vectors.
				return jsonError(409, `Vector already exists: ${v.id}`, 10008)
			}

			ns.set(v.id, v)
			updated++
		}

		return jsonOk({ operation, updated })
	}

const handleVectorizeInsert = makeVectorizeWriteHandler('insert')
const handleVectorizeUpsert = makeVectorizeWriteHandler('upsert')

const handleVectorizeDeleteByIds = async ({
	request,
	params,
}: VectorizeHandlerArgs) => {
	requiredHeader(request.headers, 'authorization')
	const accountId = String(params.accountId)
	const indexName = String(params.indexName)

	let body: any
	try {
		body = await request.json()
	} catch {
		return jsonError(400, 'Invalid JSON body for delete_by_ids.', 10006)
	}

	const ids = Array.isArray(body?.ids)
		? (body.ids as unknown[]).filter(
				(id): id is string => typeof id === 'string',
			)
		: null
	if (!ids?.length) {
		return jsonError(
			400,
			'Mock delete_by_ids expected { ids: string[] }.',
			10007,
		)
	}

	const store = getOrCreateIndexStore(accountId, indexName)
	let deleted = 0
	for (const ns of store.values()) {
		for (const id of ids) {
			if (ns.delete(id)) deleted++
		}
	}

	return jsonOk({ deleted })
}

export const cloudflareHandlers: Array<HttpHandler> = [
	// Workers AI via AI Gateway: https://gateway.ai.cloudflare.com/v1/:accountId/:gatewayId/workers-ai/<model>
	// Model names commonly contain `/`, so use a regex instead of path params.
	http.post<any, DefaultBodyType>(
		/https:\/\/gateway\.ai\.cloudflare\.com\/v1\/[^/]+\/[^/]+\/workers-ai\/.+/,
		async ({ request }) => {
			if (!shouldMockCloudflare(request)) return passthrough()
			requiredHeader(request.headers, 'authorization')

			const url = new URL(request.url)
			const model =
				modelFromWorkersAiGatewayPathname(url.pathname) ?? 'unknown-model'
			const contentType = (
				request.headers.get('content-type') ?? ''
			).toLowerCase()

			// Transcription requests in-app are raw MP3 bytes (`audio/mpeg`).
			if (contentType.includes('audio/')) {
				// Return a short, realistic-enough snippet; callers only need `.text`.
				return jsonOk({
					text: `Mock transcription (${model}): hello from Workers AI.`,
				})
			}

			const lowerModel = model.toLowerCase()

			// Most Workers AI models take JSON bodies.
			let body: any = null
			try {
				body = await request.json()
			} catch {
				// ignore
			}

			// Text-to-speech (e.g. @cf/deepgram/aura-2-en, @cf/myshell-ai/melotts).
			if (
				lowerModel.includes('deepgram/aura') ||
				lowerModel.includes('aura-') ||
				lowerModel.includes('melotts')
			) {
				const text =
					typeof body?.text === 'string'
						? body.text
						: typeof body?.prompt === 'string'
							? body.prompt
							: ''
				if (!text || !text.trim()) {
					return jsonError(
						400,
						`Mock Workers AI expected JSON body { text: string } for TTS (model: ${model}).`,
						10001,
					)
				}
				const speaker =
					typeof body?.speaker === 'string' && body.speaker.trim()
						? body.speaker.trim()
						: 'luna'
				const frequencyHz = frequencyFromSpeakerAndText(speaker, text)
				const wav = makePcm16SineWaveWav({
					durationSeconds: 6,
					frequencyHz,
				})
				return new HttpResponse(wav, {
					status: 200,
					headers: {
						'Content-Type': 'audio/wav',
						'Cache-Control': 'no-store',
					},
				})
			}

			// Text generation / chat models (used for Call Kent metadata generation).
			// Cloudflare's model-specific response shapes vary; the app code accepts
			// a `result.response` string containing JSON.
			const messagesRaw = body?.messages
			const hasMessages = Array.isArray(messagesRaw) && messagesRaw.length > 0
			const promptRaw = body?.prompt
			const hasPrompt =
				typeof promptRaw === 'string' && promptRaw.trim().length > 0
			if (hasMessages || hasPrompt) {
				const startMarker = '<<<TRANSCRIPT>>>'
				const endMarker = '<<<END TRANSCRIPT>>>'
				const messagesText = hasMessages
					? (messagesRaw as unknown[])
							.map((m: any) =>
								typeof m?.content === 'string' ? m.content : '',
							)
							.filter(Boolean)
							.join('\n\n')
					: ''
				const promptText = hasPrompt ? String(promptRaw) : ''
				const combined = `${messagesText}\n\n${promptText}`.trim()

				const startIdx = combined.indexOf(startMarker)
				const endIdx =
					startIdx === -1
						? -1
						: combined.indexOf(endMarker, startIdx + startMarker.length)
				if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
					const transcript = combined
						.slice(startIdx + startMarker.length, endIdx)
						.trim()
					const formatted = transcript
						.replace(/\r\n/g, '\n')
						// Ensure separators have blank lines around them.
						.replace(/\n{0,2}---\n{0,2}/g, '\n\n---\n\n')
						// Insert paragraph breaks after sentence-ending punctuation.
						.replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1\n\n')
						// Collapse excessive blank lines.
						.replace(/\n{3,}/g, '\n\n')
						.trim()
					return jsonOk({ response: formatted })
				}

				return jsonOk({
					response: JSON.stringify({
						title: `Mock Call Kent episode title (${model})`,
						description:
							'Mock description generated by Workers AI. This is a placeholder used in local mocks.',
						keywords: 'call kent, mock, podcast, workers ai, transcript',
					}),
				})
			}

			// Embeddings: { text: string[] }
			const textsRaw = body?.text
			const texts = Array.isArray(textsRaw)
				? textsRaw.filter((t: any) => typeof t === 'string')
				: []

			if (!texts.length) {
				return jsonError(
					400,
					`Mock Workers AI expected JSON body { text: string[] } (model: ${model}).`,
					10001,
				)
			}

			const data = texts.map((t: string) => {
				const vector = textToEmbedding(t)
				rememberEmbedding(vector, t)
				return vector
			})
			return jsonOk({
				shape: [texts.length, DEFAULT_EMBEDDING_DIMS],
				data,
			})
		},
	),

	// Vectorize query (v2)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/v2/indexes/:indexName/query`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeQuery(args)
		},
	),

	// Vectorize query (legacy)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/indexes/:indexName/query`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeQuery(args)
		},
	),

	// Vectorize write operations (v2): insert
	http.post<any, DefaultRequestMultipartBody>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/v2/indexes/:indexName/insert`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeInsert(args)
		},
	),

	// Vectorize write operations (v2): upsert
	http.post<any, DefaultRequestMultipartBody>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/v2/indexes/:indexName/upsert`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeUpsert(args)
		},
	),

	// Vectorize write operations (legacy): insert
	http.post<any, DefaultRequestMultipartBody>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/indexes/:indexName/insert`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeInsert(args)
		},
	),

	// Vectorize write operations (legacy): upsert
	http.post<any, DefaultRequestMultipartBody>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/indexes/:indexName/upsert`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeUpsert(args)
		},
	),

	// Vectorize delete_by_ids (v2)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/v2/indexes/:indexName/delete_by_ids`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeDeleteByIds(args)
		},
	),

	// Vectorize delete_by_ids (legacy)
	http.post<any, DefaultBodyType>(
		`${CLOUDFLARE_API_BASE}/accounts/:accountId/vectorize/indexes/:indexName/delete_by_ids`,
		async (args) => {
			if (!shouldMockCloudflare(args.request)) return passthrough()
			return handleVectorizeDeleteByIds(args)
		},
	),
]
