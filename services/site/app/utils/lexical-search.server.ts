import fs from 'node:fs'
import { Readable } from 'node:stream'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
	LEXICAL_SEARCH_ARTIFACT_KEYS,
	type LexicalSearchArtifact,
	type LexicalSearchArtifactChunk,
} from '../../../../other/semantic-search/lexical-search-artifact.ts'
import { getCacheDb } from '#app/utils/cache.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import {
	getInstanceInfo,
	getInstanceInfoSync,
	getInternalInstanceDomain,
} from '#app/utils/litefs-js.server.ts'

const LEXICAL_SEARCH_SYNC_INTERVAL_MS = 1000 * 60 * 5

type LexicalSearchChunkRow = LexicalSearchArtifactChunk & {
	sourceKey: string
}

type LexicalSearchMatch = {
	id: string
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	chunkIndex?: number
	chunkCount?: number
	startSeconds?: number
	endSeconds?: number
	imageUrl?: string
	imageAlt?: string
	sourceUpdatedAt?: string
	transcriptSource?: string
}

function asOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	return value
}

function asOptionalNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	return undefined
}

let lastLexicalSearchSyncAt = 0
let lexicalSearchSyncPromise: Promise<void> | null = null
let _r2Client: S3Client | null = null
let _r2ClientFingerprint: string | null = null

function writeDebugLog(payload: {
	hypothesisId: string
	location: string
	message: string
	data: Record<string, unknown>
}) {
	try {
		fs.appendFileSync(
			'/opt/cursor/logs/debug.log',
			`${JSON.stringify({ ...payload, timestamp: Date.now() })}\n`,
		)
	} catch {
		// Debug logging must never break production behavior.
	}
}

function getR2Client() {
	const env = getEnv()
	const fingerprint = [
		env.R2_ENDPOINT,
		env.R2_ACCESS_KEY_ID,
		env.R2_SECRET_ACCESS_KEY,
	].join('\0')

	if (_r2Client && _r2ClientFingerprint === fingerprint) {
		return _r2Client
	}

	_r2ClientFingerprint = fingerprint
	_r2Client = new S3Client({
		region: 'auto',
		endpoint: env.R2_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		},
	})
	return _r2Client
}

async function streamToString(body: unknown) {
	if (!body) return ''
	if (typeof body === 'string') return body
	if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8')
	if (
		typeof body === 'object' &&
		body !== null &&
		'transformToString' in body &&
		typeof body.transformToString === 'function'
	) {
		return await body.transformToString('utf-8')
	}
	if (body instanceof Readable) {
		const chunks: Buffer[] = []
		for await (const chunk of body) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}
		return Buffer.concat(chunks).toString('utf8')
	}
	return String(body)
}

function ensureLexicalSearchSchema() {
	const { currentIsPrimary } = getInstanceInfoSync()
	if (!currentIsPrimary) return

	const db = getCacheDb()
	db.exec(`
		CREATE TABLE IF NOT EXISTS lexical_search_chunks (
			id TEXT PRIMARY KEY,
			sourceKey TEXT NOT NULL,
			type TEXT NOT NULL,
			slug TEXT,
			url TEXT NOT NULL,
			title TEXT NOT NULL,
			snippet TEXT NOT NULL,
			text TEXT NOT NULL,
			chunkIndex INTEGER NOT NULL,
			chunkCount INTEGER NOT NULL,
			startSeconds INTEGER,
			endSeconds INTEGER,
			imageUrl TEXT,
			imageAlt TEXT,
			sourceUpdatedAt TEXT,
			transcriptSource TEXT
		);

		CREATE TABLE IF NOT EXISTS lexical_search_sources (
			sourceKey TEXT PRIMARY KEY,
			generatedAt TEXT NOT NULL,
			chunkCount INTEGER NOT NULL
		);

		CREATE VIRTUAL TABLE IF NOT EXISTS lexical_search_fts USING fts5(
			id UNINDEXED,
			title,
			text,
			tokenize = 'unicode61 remove_diacritics 1'
		);

		CREATE INDEX IF NOT EXISTS lexical_search_chunks_source_key_idx
			ON lexical_search_chunks(sourceKey);
	`)
}

function clearLexicalSearchSource(sourceKey: string) {
	const db = getCacheDb()
	const rows = db
		.prepare('SELECT id FROM lexical_search_chunks WHERE sourceKey = ?')
		.all(sourceKey) as Array<{ id: string }>

	const deleteFts = db.prepare('DELETE FROM lexical_search_fts WHERE id = ?')
	const deleteChunk = db.prepare(
		'DELETE FROM lexical_search_chunks WHERE sourceKey = ?',
	)
	const deleteSource = db.prepare(
		'DELETE FROM lexical_search_sources WHERE sourceKey = ?',
	)

	db.exec('BEGIN')
	try {
		for (const row of rows) deleteFts.run(row.id)
		deleteChunk.run(sourceKey)
		deleteSource.run(sourceKey)
		db.exec('COMMIT')
	} catch (error) {
		db.exec('ROLLBACK')
		throw error
	}
}

function replaceLexicalSearchSource({
	sourceKey,
	generatedAt,
	chunks,
}: {
	sourceKey: string
	generatedAt: string
	chunks: Array<LexicalSearchArtifactChunk>
}) {
	ensureLexicalSearchSchema()
	const db = getCacheDb()
	const rows = db
		.prepare('SELECT id FROM lexical_search_chunks WHERE sourceKey = ?')
		.all(sourceKey) as Array<{ id: string }>

	const deleteFts = db.prepare('DELETE FROM lexical_search_fts WHERE id = ?')
	const deleteChunk = db.prepare(
		'DELETE FROM lexical_search_chunks WHERE sourceKey = ?',
	)
	const insertChunk = db.prepare(`
		INSERT INTO lexical_search_chunks (
			id,
			sourceKey,
			type,
			slug,
			url,
			title,
			snippet,
			text,
			chunkIndex,
			chunkCount,
			startSeconds,
			endSeconds,
			imageUrl,
			imageAlt,
			sourceUpdatedAt,
			transcriptSource
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	const insertFts = db.prepare(
		'INSERT INTO lexical_search_fts (id, title, text) VALUES (?, ?, ?)',
	)
	const upsertSource = db.prepare(`
		INSERT OR REPLACE INTO lexical_search_sources (sourceKey, generatedAt, chunkCount)
		VALUES (?, ?, ?)
	`)
	const startedAt = Date.now()
	// #region agent log
	writeDebugLog({
		hypothesisId: 'D',
		location: 'lexical-search.server.ts:217',
		message: 'lexical source replace starting',
		data: {
			sourceKey,
			existingRowCount: rows.length,
			incomingChunkCount: chunks.length,
		},
	})
	// #endregion

	db.exec('BEGIN')
	try {
		for (const row of rows) deleteFts.run(row.id)
		deleteChunk.run(sourceKey)

		for (const chunk of chunks) {
			insertChunk.run(
				chunk.id,
				sourceKey,
				chunk.type,
				chunk.slug ?? null,
				chunk.url,
				chunk.title,
				chunk.snippet,
				chunk.text,
				chunk.chunkIndex,
				chunk.chunkCount,
				chunk.startSeconds ?? null,
				chunk.endSeconds ?? null,
				chunk.imageUrl ?? null,
				chunk.imageAlt ?? null,
				chunk.sourceUpdatedAt ?? null,
				chunk.transcriptSource ?? null,
			)
			insertFts.run(chunk.id, chunk.title, chunk.text)
		}

		upsertSource.run(sourceKey, generatedAt, chunks.length)
		db.exec('COMMIT')
		// #region agent log
		writeDebugLog({
			hypothesisId: 'D',
			location: 'lexical-search.server.ts:256',
			message: 'lexical source replace committed',
			data: {
				sourceKey,
				incomingChunkCount: chunks.length,
				durationMs: Date.now() - startedAt,
			},
		})
		// #endregion
	} catch (error) {
		db.exec('ROLLBACK')
		throw error
	}
}

function getLexicalSearchSourceState(sourceKey: string) {
	ensureLexicalSearchSchema()
	const db = getCacheDb()
	return (db
		.prepare(
			'SELECT generatedAt, chunkCount FROM lexical_search_sources WHERE sourceKey = ?',
		)
		.get(sourceKey) ?? null) as null | {
		generatedAt: string
		chunkCount: number
	}
}

async function getLexicalSearchArtifact(
	key: string,
): Promise<LexicalSearchArtifact | null> {
	const env = getEnv()
	const client = getR2Client()
	try {
		const response = await client.send(
			new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
		)
		const text = await streamToString(response.Body)
		if (!text.trim()) return null
		return JSON.parse(text) as LexicalSearchArtifact
	} catch (error) {
		const name =
			error && typeof error === 'object' && 'name' in error
				? String(error.name)
				: ''
		const message = error instanceof Error ? error.message : String(error)
		if (name === 'NoSuchKey' || /NoSuchKey|not found|404/i.test(message)) {
			return null
		}
		throw error
	}
}

export async function syncLexicalSearchArtifactsFromR2({
	force = false,
}: {
	force?: boolean
} = {}) {
	ensureLexicalSearchSchema()

	for (const sourceKey of LEXICAL_SEARCH_ARTIFACT_KEYS) {
		const artifact = await getLexicalSearchArtifact(sourceKey)
		const sourceState = artifact ? getLexicalSearchSourceState(sourceKey) : null
		// #region agent log
		writeDebugLog({
			hypothesisId: 'A',
			location: 'lexical-search.server.ts:315',
			message: 'lexical artifact state evaluated',
			data: {
				sourceKey,
				force,
				hasArtifact: Boolean(artifact),
				artifactChunkCount: artifact?.chunks.length,
				artifactGeneratedAt: artifact?.generatedAt,
				existingChunkCount: sourceState?.chunkCount,
				existingGeneratedAt: sourceState?.generatedAt,
			},
		})
		// #endregion
		if (!artifact) {
			clearLexicalSearchSource(sourceKey)
			continue
		}

		if (
			!force &&
			sourceState?.generatedAt === artifact.generatedAt &&
			sourceState.chunkCount === artifact.chunks.length
		) {
			continue
		}

		replaceLexicalSearchSource({
			sourceKey,
			generatedAt: artifact.generatedAt,
			chunks: artifact.chunks,
		})
	}
}

export async function requestPrimaryLexicalSearchSync({
	force = false,
}: {
	force?: boolean
} = {}) {
	const startedAt = Date.now()
	const { currentIsPrimary, primaryInstance } = await getInstanceInfo()
	// #region agent log
	writeDebugLog({
		hypothesisId: 'C',
		location: 'lexical-search.server.ts:344',
		message: 'primary lexical sync requested',
		data: {
			force,
			currentIsPrimary,
			primaryInstance,
		},
	})
	// #endregion
	if (currentIsPrimary) {
		await syncLexicalSearchArtifactsFromR2({ force })
		// #region agent log
		writeDebugLog({
			hypothesisId: 'C',
			location: 'lexical-search.server.ts:356',
			message: 'primary lexical sync finished locally',
			data: {
				force,
				durationMs: Date.now() - startedAt,
			},
		})
		// #endregion
		return
	}

	const domain = getInternalInstanceDomain(primaryInstance)
	const token = getEnv().INTERNAL_COMMAND_TOKEN
	const response = await fetch(`${domain}/resources/cache/sqlite`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			operation: 'sync-lexical-search',
			force,
		}),
	})
	// #region agent log
	writeDebugLog({
		hypothesisId: 'C',
		location: 'lexical-search.server.ts:373',
		message: 'primary lexical sync response received',
		data: {
			force,
			ok: response.ok,
			status: response.status,
			durationMs: Date.now() - startedAt,
		},
	})
	// #endregion
	if (!response.ok) {
		throw new Error(
			`Unable to sync lexical search on primary (${primaryInstance}): ${response.status} ${response.statusText}`,
		)
	}
}

export async function ensureLexicalSearchReady() {
	ensureLexicalSearchSchema()
	// #region agent log
	writeDebugLog({
		hypothesisId: 'B',
		location: 'lexical-search.server.ts:386',
		message: 'ensure lexical search ready entered',
		data: {
			msSinceLastSync: Date.now() - lastLexicalSearchSyncAt,
			hasInFlightSync: Boolean(lexicalSearchSyncPromise),
		},
	})
	// #endregion
	if (Date.now() - lastLexicalSearchSyncAt < LEXICAL_SEARCH_SYNC_INTERVAL_MS) {
		return
	}
	if (lexicalSearchSyncPromise) {
		await lexicalSearchSyncPromise
		return
	}

	lexicalSearchSyncPromise = (async () => {
		await requestPrimaryLexicalSearchSync()
		lastLexicalSearchSyncAt = Date.now()
	})()

	try {
		await lexicalSearchSyncPromise
	} finally {
		lexicalSearchSyncPromise = null
	}
}

function buildLexicalSearchMatchQuery(query: string) {
	const terms: string[] = []
	for (const match of query.matchAll(/"([^"]+)"|([\p{L}\p{N}_-]+)/gu)) {
		const phrase = match[1]?.trim()
		if (phrase) {
			terms.push(`"${phrase.replace(/"/g, '""')}"`)
			continue
		}
		const token = match[2]?.trim()
		if (token) terms.push(token)
	}
	if (!terms.length) return null
	return terms.join(' OR ')
}

export function queryLexicalSearch({
	query,
	topK,
}: {
	query: string
	topK: number
}): Array<LexicalSearchMatch> {
	const matchQuery = buildLexicalSearchMatchQuery(query)
	if (!matchQuery) return []

	const db = getCacheDb()
	const runQuery = (candidateQuery: string) =>
		(
			db
				.prepare(
					`
				SELECT
					c.id,
					c.type,
					c.slug,
					c.url,
					c.title,
					c.snippet,
					c.chunkIndex,
					c.chunkCount,
					c.startSeconds,
					c.endSeconds,
					c.imageUrl,
					c.imageAlt,
					c.sourceUpdatedAt,
					c.transcriptSource
				FROM lexical_search_fts f
				JOIN lexical_search_chunks c ON c.id = f.id
				WHERE lexical_search_fts MATCH ?
				ORDER BY bm25(lexical_search_fts, 10.0, 1.0), c.chunkIndex
				LIMIT ?
			`,
				)
				.all(candidateQuery, topK) as Array<Record<string, unknown>>
		).map((row) => ({
			id: String(row.id),
			type: asOptionalString(row.type),
			slug: asOptionalString(row.slug),
			title: asOptionalString(row.title),
			url: asOptionalString(row.url),
			snippet: asOptionalString(row.snippet),
			chunkIndex: asOptionalNumber(row.chunkIndex),
			chunkCount: asOptionalNumber(row.chunkCount),
			startSeconds: asOptionalNumber(row.startSeconds),
			endSeconds: asOptionalNumber(row.endSeconds),
			imageUrl: asOptionalString(row.imageUrl),
			imageAlt: asOptionalString(row.imageAlt),
			sourceUpdatedAt: asOptionalString(row.sourceUpdatedAt),
			transcriptSource: asOptionalString(row.transcriptSource),
		}))

	try {
		ensureLexicalSearchSchema()
		return runQuery(matchQuery)
	} catch {
		const fallbackQuery = query
			.split(/\s+/)
			.map((token) => token.replace(/[^\p{L}\p{N}_-]+/gu, '').trim())
			.filter(Boolean)
			.join(' OR ')
		if (!fallbackQuery) return []
		try {
			return runQuery(fallbackQuery)
		} catch {
			return []
		}
	}
}

export function getLexicalSearchChunkCount() {
	try {
		ensureLexicalSearchSchema()
		const db = getCacheDb()
		const result = db
			.prepare('SELECT COUNT(*) as count FROM lexical_search_chunks')
			.get() as { count: number }
		return result.count
	} catch {
		return 0
	}
}
